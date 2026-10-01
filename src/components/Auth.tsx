import { useState } from 'react';
import { User } from '../types';

interface AuthProps {
  mode: 'login' | 'signup';
  onAuth: (user: User) => void;
  onSwitch: () => void;
}

export default function Auth({ mode, onAuth, onSwitch }: AuthProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit() {
    const name = mode === 'signup'
      ? `${firstName} ${lastName}`.trim() || email.split('@')[0]
      : email.split('@')[0];
    onAuth({ name: name || 'User', email: email || 'user@example.com' });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-[900px] grid grid-cols-1 md:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-[0_12px_40px_rgba(37,99,235,0.18)]">

        {/* Brand side */}
        <div className="hidden md:flex flex-col justify-center bg-gradient-to-br from-blue-800 to-blue-600 p-10 text-white">
          <span className="font-['Fraunces'] font-black text-2xl mb-8">CodeTech Gadgets</span>
          <h2 className="font-['Fraunces'] font-black text-2xl mb-3 leading-tight">
            Africa's Premier Tech Destination
          </h2>
          <p className="text-blue-100 text-sm leading-relaxed">
            Premium gadgets delivered to your door across Nigeria.
          </p>
          <ul className="mt-6 space-y-2">
            {['100% Authentic products', '12 cities across Nigeria', 'Fast 24–48hr delivery', '1-Year warranty'].map(p => (
              <li key={p} className="flex items-center gap-2 text-blue-100 text-sm">
                <span className="text-green-400">✓</span> {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Form side */}
        <div className="p-8 sm:p-10">
          <h3 className="font-['Fraunces'] font-black text-2xl text-blue-950 mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h3>
          <p className="text-slate-500 text-sm mb-7">
            {mode === 'login' ? 'Sign in to your account' : 'Join thousands of happy customers'}
          </p>

          <div className="space-y-3.5">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">First Name</label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)}
                    placeholder="Akorede" className="input-style" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-950 mb-1">Last Name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)}
                    placeholder="Alao" className="input-style" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" className="input-style" />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-950 mb-1">Password</label>
              <input type="password" placeholder="Min. 8 characters" className="input-style" />
            </div>
          </div>

          <button onClick={handleSubmit}
            className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl
                       shadow-[0_2px_12px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.35)]
                       hover:-translate-y-0.5 transition-all text-sm">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <p className="text-center text-slate-500 text-sm mt-5">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={onSwitch} className="text-blue-600 font-bold hover:underline">
              {mode === 'login' ? 'Sign up →' : 'Log in →'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
