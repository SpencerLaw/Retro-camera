import React, { useState } from 'react';
import { SearchIcon, LocationIcon } from './Icons';

interface SearchBarProps {
  onSearch: (city: string) => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value.trim());
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
    >
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
           <SearchIcon className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter city..."
          disabled={isLoading}
          className="w-full h-14 pl-12 pr-12 rounded-full bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 text-gray-700 text-lg font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-70"
        />
        <button 
          type="button" 
          disabled={isLoading}
          className="absolute inset-y-0 right-2 flex items-center justify-center w-10 h-10 my-auto text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
        >
          <LocationIcon className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};

export default SearchBar;