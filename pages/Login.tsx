import React, { useState } from 'react';
import { useApp } from '../services/AppContext';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Role } from '../types';

export const Login = () => {
  const { login, isLoading } = useApp();
  const [role, setRole] = useState<Role>(Role.TEACHER);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (role === Role.TEACHER && !password) {
       setError('กรุณากรอกรหัสผ่าน');
       return;
    }

    // Call async login
    const success = await login(username, role === Role.TEACHER ? password : '', role);
    if (!success) {
      setError(role === Role.TEACHER ? 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' : 'ไม่พบรหัสนักเรียนนี้ในระบบ');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gr5/30 to-gr6/30 p-4 font-['Sarabun']">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-white/50">
        <div className="text-center mb-8">
          <img 
            src="https://img5.pic.in.th/file/secure-sv1/-21d5e37cfa61c42627.png" 
            alt="School Logo" 
            className="w-28 h-28 mx-auto mb-4 drop-shadow-md hover:scale-105 transition-transform duration-300" 
          />
          <h1 className="text-2xl font-bold text-gray-800 font-['Mitr']">ยินดีต้อนรับเข้าสู่ระบบ</h1>
          <p className="text-gray-500">ระบบบันทึกคะแนนสุขศึกษาและพลศึกษา</p>
        </div>

        {/* Role Toggle */}
        <div className="bg-gray-100 p-1 rounded-xl flex mb-6 relative">
          <button
            type="button"
            onClick={() => { setRole(Role.TEACHER); setUsername(''); setPassword(''); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              role === Role.TEACHER ? 'bg-white shadow-sm text-accent' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            สำหรับครู
          </button>
          <button
            type="button"
            onClick={() => { setRole(Role.STUDENT); setUsername(''); setPassword(''); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              role === Role.STUDENT ? 'bg-white shadow-sm text-gr6' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            สำหรับนักเรียน
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {role === Role.TEACHER ? 'ชื่อผู้ใช้ (Username)' : 'เลขประจำตัวนักเรียน (Student ID)'}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent/50 focus:border-accent outline-none transition-all"
                placeholder={role === Role.TEACHER ? "เช่น kai" : "ระบุเลขประจำตัว เช่น 1782"}
                disabled={isLoading}
              />
            </div>
          </div>

          {role === Role.TEACHER && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-accent/50 focus:border-accent outline-none transition-all"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {role === Role.TEACHER && (
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-gray-500 cursor-pointer">
                <input type="checkbox" className="mr-2 rounded border-gray-300 text-accent focus:ring-accent" />
                จำรหัสผ่าน
              </label>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-error text-sm p-3 rounded-xl flex items-center animate-pulse">
              <span className="mr-2">⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded-xl text-white font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 ${
              role === Role.TEACHER ? 'bg-accent disabled:bg-orange-300' : 'bg-gr6 disabled:bg-teal-300'
            }`}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <>เข้าสู่ระบบ <ArrowRight size={20} /></>}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-400">
          <p>Teacher: KruPrapars Palasai </p>
          <p>Student: ระบุเลขประจำตัวนักเรียน ของนักเรียน </p>
        </div>
      </div>

      <footer className="mt-8 text-center">
         <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/40 border border-white/50 shadow-sm backdrop-blur-sm hover:bg-white/60 transition-colors cursor-default">
           <span className="text-gray-600 text-sm font-medium">พัฒนาและออกแบบโดย</span>
           <span className="text-accent font-bold font-['Mitr']">Krukai</span>
           <span className="text-gray-400 text-xs border-l border-gray-300 pl-2">@2025</span>
         </div>
      </footer>
    </div>
  );
};
