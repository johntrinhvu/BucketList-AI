import React, { useState, useEffect } from 'react';
import { MdCheckBoxOutlineBlank, MdCheckBox } from "react-icons/md";
import { FaRegTrashAlt } from "react-icons/fa";
import FlightCard from "../../components/FlightCard/FlightCard";

export default function Dashboard() {
    const [items, setItems] = useState([]);
    const [inputValue, setInputValue] = useState('');

    const flights = [
        {
            airline: { name: 'Alaska Airlines', logo: 'https://m.media-amazon.com/images/I/51f3uYGjenL._h1_.png' },
            time: '1:26 PM - 9:30 PM',
            duration: '5 hr 4 min',
            emissions: { value: 368, change: 14, label: '+14% emissions' },
            price: 605,
            details: ['Boeing 737', 'Meal included', 'Free Wi-Fi available']
        },
        {
            airline: { name: 'United Airlines', logo: 'https://ih1.redbubble.net/image.4826145001.4783/raf,360x360,075,t,fafafa:ca443f4786.jpg' },
            time: '6:45 AM - 2:59 PM',
            duration: '5 hr 14 min',
            emissions: { value: 254, change: -21, label: '-21% emissions' },
            price: 613,
            details: ['Boeing 737', 'Extra legroom', 'In-flight entertainment']
        },
        {
            airline: { name: 'Delta Airlines', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRDG3mx0ouDRNS5kGnGS6SxoO8r9nO369SBKw&s' },
            time: '6:45 AM - 2:59 PM',
            duration: '5 hr 14 min',
            emissions: { value: 254, change: -21, label: '-21% emissions' },
            price: 613,
            details: ['Boeing 737', 'Extra legroom', 'In-flight entertainment']
        },
        {
            airline: { name: 'American Airlines', logo: 'https://external-preview.redd.it/noGVmHkGp3tV46SVyR3TSndGMlFp-2Vf3uLBm9UUZlY.png?auto=webp&s=fd18075339f5cf34ee0a7512ede6476c619a21cb' },
            time: '6:45 AM - 2:59 PM',
            duration: '5 hr 14 min',
            emissions: { value: 368, change: 14, label: '+14% emissions' },
            price: 613,
            details: ['Boeing 737', 'Extra legroom', 'In-flight entertainment']
        },
        {
            airline: { name: 'Spirit Airlines', logo: 'https://i.etsystatic.com/11453548/r/il/8ec664/1689755000/il_570xN.1689755000_9e6k.jpg' },
            time: '6:45 AM - 2:59 PM',
            duration: '5 hr 14 min',
            emissions: { value: 254, change: -21, label: '-21% emissions' },
            price: 613,
            details: ['Boeing 737', 'Extra legroom', 'In-flight entertainment']
        },
        {
            airline: { name: 'Korean Air', logo: 'https://i.pinimg.com/originals/79/2b/c9/792bc9f5ca882dd26d13bc5b0ac3337a.jpg' },
            time: '6:45 AM - 2:59 PM',
            duration: '5 hr 14 min',
            emissions: { value: 368, change: 14, label: '+14% emissions' },
            price: 613,
            details: ['Boeing 737', 'Extra legroom', 'In-flight entertainment']
        },
    ];

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/bucket', {
                    method: 'GET',
                    credentials: 'include', 
                });

                if (response.ok) {
                    const data = await response.json();
                    setItems(data.items); 
                } else {
                    console.error('Failed to fetch items');
                }
            } catch (error) {
                console.error('Error fetching items:', error);
            }
        };

        fetchItems();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (inputValue.trim() === '') return;

        try {
            const response = await fetch('http://localhost:3001/api/bucket/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', 
                body: JSON.stringify({ description: inputValue }),
            });

            if (response.ok) {
                const newItem = await response.json();
                setItems((prevItems) => [...prevItems, newItem]); // Add new item to list
                setInputValue(''); // Clear input field
            } else {
                console.error('Failed to add item');
            }
        } catch (error) {
            console.error('Error adding item:', error);
        }
    }

    const handleCompleteToggle = async (itemId, completed) => {
        try {
            const response = await fetch(`http://localhost:3001/api/bucket/items/${itemId}/completed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', // Ensure cookies are sent
                body: JSON.stringify({ completed: !completed }),
            });

            if (response.ok) {
                setItems((prevItems) =>
                    prevItems.map((item) =>
                        item.id === itemId ? { ...item, completed: !completed } : item
                    )
                );
            } else {
                console.error('Failed to update item');
            }
        } catch (error) {
            console.error('Error updating item:', error);
        }
    }

    const handleDelete = async (itemId) => {
        try {
            const response = await fetch(`http://localhost:3001/api/bucket/items/${itemId}`, {
                method: 'DELETE',
                credentials: 'include', // Ensure cookies are sent
            });

            if (response.ok) {
                setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
            } else {
                console.error('Failed to delete item');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    }

    return (
        <div className="pt-28 min-h-screen">
            <div className="flex flex-col items-center justify-center lg:flex-row lg:items-start lg:gap-12 lg:px-16">

                {/* Left Column */}
                <div className="w-full lg:w-1/2 flex flex-col items-center">
                    <h1 className="text-3xl sm:text-4xl font-semibold">Your BucketList</h1>
                    <div className="mt-4 flex flex-col rounded-lg max-w-md w-11/12 sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl">
                        <form onSubmit={handleSubmit}>
                            <div className="flex items-center p-2 gap-2">
                                <input 
                                    type="text"
                                    required
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Something you'd like to do"
                                    className="shadow-md text-sm flex-grow p-2 border rounded-md focus:outline-none"
                                />
                                <button type="submit" className="shadow-md p-2 bg-sky-600 text-white rounded-md hover:bg-sky-400 ease-in duration-100">Add to List</button>
                            </div>
                        </form>
                        <div className="mt-12 m-3 flex gap-6 font-semibold border-b-2 border-gray-600">
                            <h3 className="flex-grow">BucketList Item</h3>
                            <h3 className="text-right">Actions</h3>
                        </div>
                        <ul className="p-2">
                            {items.map((item, index) => (
                                <li className="flex gap-6 items-center" key={item.id}>
                                    <button onClick={() => handleCompleteToggle(item.id, item.completed)} className="ml-1 text-center">
                                        {item.completed ? <MdCheckBox size={24} /> : <MdCheckBoxOutlineBlank size={24} />}
                                    </button>
                                    <span className={`flex-grow ${item.completed ? 'line-through' : ''}`}>{item.description}</span>
                                    <div>
                                        <button onClick={() => handleDelete(item.id)} className="mr-1"><FaRegTrashAlt size={22} /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Column */}
                <div className="pt-20 lg:pt-0 w-full lg:w-1/2 flex flex-col items-center">
                    <h1 className="text-3xl sm:text-4xl font-semibold">Real-time Flight Data</h1>
                    <div className="mt-4 flex flex-col rounded-lg max-w-md w-11/12 sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl">
                        {flights.map((flight, index) => (
                            <FlightCard key={index} {...flight} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}