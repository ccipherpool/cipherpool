import React from "react";

const SearchComponent = ({ placeholder = "Search...", className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div id="cp-poda" className="relative flex items-center justify-center group">
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[70px] max-w-[314px] rounded-xl blur-[3px]
          before:absolute before:content-[''] before:z-[-2] before:w-[999px] before:h-[999px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[60deg]
          before:bg-[conic-gradient(#000,#0891b2_5%,#000_38%,#000_50%,#06b6d4_60%,#000_87%)] before:transition-all before:duration-[2000ms]
          group-hover:before:rotate-[-120deg] group-focus-within:before:rotate-[420deg] group-focus-within:before:duration-[4000ms]" />
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[65px] max-w-[312px] rounded-xl blur-[3px]
          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[82deg]
          before:bg-[conic-gradient(rgba(0,0,0,0),#0c4a6e,rgba(0,0,0,0)_10%,rgba(0,0,0,0)_50%,#0e7490,rgba(0,0,0,0)_60%)] before:transition-all before:duration-[2000ms]
          group-hover:before:rotate-[-98deg] group-focus-within:before:rotate-[442deg] group-focus-within:before:duration-[4000ms]" />
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[63px] max-w-[307px] rounded-lg blur-[2px]
          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[83deg]
          before:bg-[conic-gradient(rgba(0,0,0,0)_0%,#67e8f9,rgba(0,0,0,0)_8%,rgba(0,0,0,0)_50%,#22d3ee,rgba(0,0,0,0)_58%)] before:brightness-[1.4]
          before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-97deg] group-focus-within:before:rotate-[443deg] group-focus-within:before:duration-[4000ms]" />
        <div className="absolute z-[-1] overflow-hidden h-full w-full max-h-[59px] max-w-[303px] rounded-xl blur-[0.5px]
          before:absolute before:content-[''] before:z-[-2] before:w-[600px] before:h-[600px] before:bg-no-repeat before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-[70deg]
          before:bg-[conic-gradient(#080810,#0891b2_5%,#080810_14%,#080810_50%,#06b6d4_60%,#080810_64%)] before:brightness-[1.3]
          before:transition-all before:duration-[2000ms] group-hover:before:rotate-[-110deg] group-focus-within:before:rotate-[430deg] group-focus-within:before:duration-[4000ms]" />

        <div className="relative group">
          <input
            placeholder={placeholder}
            type="text"
            className="bg-[#0c0c1a] border-none w-[301px] h-[56px] rounded-lg text-white px-[59px] text-base focus:outline-none placeholder-gray-500"
          />
          <div className="pointer-events-none w-[100px] h-[20px] absolute bg-gradient-to-r from-transparent to-[#0c0c1a] top-[18px] left-[70px] group-focus-within:hidden" />
          <div className="pointer-events-none w-[30px] h-[20px] absolute bg-[#06b6d4] top-[10px] left-[5px] blur-2xl opacity-80 transition-all duration-[2000ms] group-hover:opacity-0" />
          <div className="absolute left-5 top-[15px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" viewBox="0 0 24 24" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" height="24" fill="none">
              <circle stroke="url(#cp-search-grad)" r="8" cy="11" cx="11" />
              <line stroke="url(#cp-searchl-grad)" y2="16.65" y1="22" x2="16.65" x1="22" />
              <defs>
                <linearGradient gradientTransform="rotate(50)" id="cp-search-grad">
                  <stop stopColor="#67e8f9" offset="0%" />
                  <stop stopColor="#0891b2" offset="50%" />
                </linearGradient>
                <linearGradient id="cp-searchl-grad">
                  <stop stopColor="#0891b2" offset="0%" />
                  <stop stopColor="#164e63" offset="50%" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export { SearchComponent };
export default SearchComponent;
