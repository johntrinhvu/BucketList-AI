from fastapi import FastAPI, HTTPException, status, Depends, Request, Response, Query
from pydantic import BaseModel
from api.openai_handler import router as openai_router
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.middleware.cors import CORSMiddleware
from api.amadeus import get_access_token, search_cheapest_flights
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import List
import os
import sys
import uvicorn
import uuid
from dotenv import load_dotenv
load_dotenv()

from dal import UserDAL, BucketList, BucketListItem

# Configuration
MONGODB_URI = os.environ["MONGODB_URI"]
DATABASE_NAME = "bucketlist_db"
USER_COLLECTION = "users"
BUCKET_COLLECTION = "buckets"
FLIGHT_COLLECTION = "flights"
SESSION_COOKIE_NAME = "session_id"
DEBUG = os.environ.get("DEBUG", "").strip().lower() in {"1", "true", "on", "yes"}

# In-memory session store
sessions = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    client = AsyncIOMotorClient(MONGODB_URI)
    database = client.get_database(DATABASE_NAME)

    # Ensure the database is available
    pong = await database.command("ping")
    if int(pong["ok"]) != 1:
        raise Exception("Cluster connection is not okay!")

    user_collection = database.get_collection(USER_COLLECTION)
    bucket_collection = database.get_collection(BUCKET_COLLECTION)
    flight_collection = database.get_collection(FLIGHT_COLLECTION)
    app.user_dal = UserDAL(user_collection, bucket_collection, flight_collection)

    # Yield back to FastAPI Application
    yield

    # Shutdown
    client.close()

app = FastAPI(lifespan=lifespan)
app.include_router(openai_router, prefix="/api/openai")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class NewItem(BaseModel):
    description: str

class NewItemResponse(BaseModel):
    id: str
    description: str

class ItemUpdate(BaseModel):
    completed: bool

class Price(BaseModel):
    total: float

class Links(BaseModel):
    flightDates: str
    flightOffers: str

# FlightInfo model
class FlightInfo(BaseModel):
    origin: str
    destination: str
    departureDate: str
    price: float


class FlightResponse(BaseModel):
    data: list[FlightInfo]

# Helper function to create session and set cookie
def create_session(response: Response, bucket_id: str):
    session_id = str(uuid.uuid4())  # Generate a unique session ID
    sessions[session_id] = bucket_id  # Store bucket_id in memory
    response.set_cookie(key=SESSION_COOKIE_NAME, value=session_id, httponly=True, secure=False, samesite='Lax')

# check the session
@app.get("/api/session")
async def check_session(request: Request):
    """Check if the user is authenticated"""
    try:
        bucket_id = get_current_bucket_id(request)
        return {"message": "Session is valid", "bucket_id": bucket_id}
    except HTTPException:
        raise HTTPException(status_code=401, detail="Not authenticated")

# Login and registration
@app.post("/api/register", status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, response: Response):
    """Register a new user and create a bucket for them"""
    existing_user = await app.user_dal.get_user_by_username(user.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = await app.user_dal.create_user(user.username, user.password)
    
    # Create session and store bucket_id in session
    create_session(response, new_user.bucket_id)
    
    return {"message": "User created successfully", "bucket_id": new_user.bucket_id}

@app.post("/api/login", status_code=status.HTTP_200_OK)
async def login_user(user: UserLogin, response: Response):
    """Log in a user and create a session"""
    db_user = await app.user_dal.get_user_by_username(user.username)
    if not db_user or not await app.user_dal.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    # Create session and store bucket_id in session
    create_session(response, db_user.bucket_id)
    print(f"User logged in - ID: {db_user.id}, Username: {db_user.username}")

    return {"message": "Login successful", "user_id": str(db_user.id)}

# Get current bucket_id from session
def get_current_bucket_id(request: Request) -> str:
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id or session_id not in sessions:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return sessions[session_id]

# Bucket operations
@app.get("/api/bucket", response_model=BucketList)
async def get_user_bucket(request: Request):
    """Retrieve the logged-in user's bucket"""
    bucket_id = get_current_bucket_id(request)
    bucket = await app.user_dal.get_bucket(bucket_id)
    if not bucket:
        raise HTTPException(status_code=404, detail="Bucket not found")
    return bucket

@app.post("/api/bucket/items", status_code=status.HTTP_201_CREATED, response_model=NewItemResponse)
async def add_item_to_bucket(item: NewItem, request: Request):
    """Add a new item to the user's bucket"""
    bucket_id = get_current_bucket_id(request)
    print(bucket_id)
    bucket = await app.user_dal.add_item_to_bucket(bucket_id, item.description)
    if not bucket:
        raise HTTPException(status_code=404, detail="Bucket not found")
    print(bucket)
    return NewItemResponse(id=bucket.items[-1].id, description=item.description)

@app.post("/api/bucket/items/{item_id}/completed", response_model=BucketList)
async def update_item_completed(item_id: str, update: ItemUpdate, request: Request):
    """Update the completion status of a bucket list item"""
    bucket_id = get_current_bucket_id(request)
    bucket = await app.user_dal.set_item_completed(bucket_id=bucket_id, item_id=item_id, completed=update.completed)
    if not bucket:
        raise HTTPException(status_code=404, detail="Bucket not found")

    return bucket

@app.delete("/api/bucket/items/{item_id}", response_model=BucketList)
async def delete_item(item_id: str, request: Request):
    """Delete an item from the user's bucket list"""
    bucket_id = get_current_bucket_id(request)
    bucket = await app.user_dal.delete_item(bucket_id=bucket_id, item_id=item_id)
    if not bucket:
        raise HTTPException(status_code=404, detail="Bucket not found")

    return bucket

@app.get("/search-cheapest-flights")
async def get_cheapest_flights(
    origin: str,
    max_price: int = Query(None, description="Maximum price filter for flights"),
    access_token: str = "",

):
    try:
        # Call the Amadeus API to search for flights
        flights = search_cheapest_flights(origin, max_price, access_token)

        # Insert each flight into MongoDB and return the inserted documents
        dest_list = []
        inserted_flights = []
        for flight in flights:
            #check destination 
            destination = flight.get("destination")
            if destination not in dest_list:
                dest_list.append(destination)
                inserted_flight = await app.user_dal.save_flight_data(flight)  # Save the entire flight JSON into MongoDB
                inserted_flights.append(inserted_flight)
            if len(dest_list) == 6:
                break

        return inserted_flights

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching flights: {e}")

@app.get("/access-token")
def access_token():
    print(get_access_token())

@app.get("/")
def root_page():
    return "Hello from root!"

# Main function to start the server
def main():
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=3001,
        log_level="info",
        access_log=True,
        use_colors=True,
        proxy_headers=True,
    )

if __name__ == "__main__":
    main()
