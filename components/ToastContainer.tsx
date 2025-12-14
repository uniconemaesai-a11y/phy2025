
import React from 'react';
import { useApp } from '../services/AppContext';
import { CheckCircle, AlertTriangle, Bell, X, Info } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none p-4 md:p-0 w-full md:w-auto items-end">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`pointer-events-auto w-full md:w-80 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border-l-4 overflow-hidden relative group animate-slide-in hover:scale-[1.02] transition-transform ${
            toast.type === 'success' ? 'border-green-500' : 
            toast.type === 'error' ? 'border-red-500' : 'border-blue-500'
          }`}
        >
           <div className="p-4 flex gap-3">
               <div className={`shrink-0 p-2 rounded-full h-fit flex items-center justify-center ${
                 toast.type === 'success' ? 'bg-green-50 text-green-500' : 
                 toast.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'
               }`}>
                 {toast.type === 'success' ? <CheckCircle size={20}/> :
                  toast.type === 'error' ? <AlertTriangle size={20}/> : <Info size={20}/>}
               </div>
               <div className="flex-1 min-w-0">
                 <h4 className="font-bold text-gray-800 text-sm truncate">{toast.title}</h4>
                 <p className="text-sm text-gray-500 mt-1 leading-snug break-words">{toast.message}</p>
               </div>
               <button 
                 onClick={() => removeToast(toast.id)}
                 className="text-gray-400 hover:text-gray-600 h-fit p-1 rounded-md hover:bg-gray-100 transition-colors self-start"
               >
                 <X size={16} />
               </button>
           </div>
           {/* Progress Bar */}
           <div className="h-1 w-full bg-gray-100 absolute bottom-0 left-0">
               <div 
                  className={`h-full animate-progress origin-left ${
                    toast.type === 'success' ? 'bg-green-500' : 
                    toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`}
               ></div>
           </div>
        </div>
      ))}
    </div>
  );
};
