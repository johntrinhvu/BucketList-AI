import React from 'react';
import ReactDOM from 'react-dom/client';

import './Login.css';

export default function Login() {
  return (
    <div className="A">
      <form action="#">
        <h2>Welcome</h2>
        <div className="input">
            <input type="text" required/>
            <label>Username</label>
        </div>
        <div className="input">
            <input type="password" required/>
            <label>Password</label>
        </div>
        <div className="forgotten">
            <label for="remember">
                <input type="checkbox" id="remember"/>
                <p>Remember Me</p>
            </label>
        </div>

      </form>
    </div>
  );
}