
import React from 'react';
import { useApp, SHOP_ITEMS } from '../services/AppContext';
import { Card } from '../components/Card';
import { ShoppingBag, Coins, Briefcase } from 'lucide-react';

export const StudentShop = () => {
  const { currentUser, studentDataExtras, buyItem } = useApp();

  if (!currentUser) return null;

  const userData = studentDataExtras[currentUser.id] || { coins: 0, inventory: [] };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-3xl p-8 text-white flex justify-between items-center shadow-lg">
          <div>
              <h1 className="text-3xl font-bold font-['Mitr'] flex items-center gap-3">
                  <ShoppingBag size={32}/> ร้านค้าสวัสดิการ
              </h1>
              <p className="opacity-90 mt-1">ใช้เหรียญจากการทำภารกิจ แลกของรางวัลสุดพิเศษ!</p>
          </div>
          <div className="bg-black/30 backdrop-blur-md px-6 py-3 rounded-2xl flex items-center gap-3 border border-white/20">
              <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-800 shadow-inner">
                  <Coins size={24} />
              </div>
              <div>
                  <p className="text-xs font-bold text-yellow-200">เหรียญของคุณ</p>
                  <p className="text-2xl font-bold font-mono">{userData.coins}</p>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Shop Items */}
          <div className="lg:col-span-2">
              <h3 className="font-bold text-gray-700 mb-4 text-lg">สินค้าแนะนำ</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SHOP_ITEMS.map(item => (
                      <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-4">
                              <div className="text-4xl bg-gray-50 p-3 rounded-2xl">{item.icon}</div>
                              <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                                  <Coins size={14}/> {item.price}
                              </span>
                          </div>
                          <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
                          <p className="text-sm text-gray-500 mb-4 flex-1">{item.description}</p>
                          <button 
                              onClick={() => buyItem(currentUser.id, item)}
                              disabled={userData.coins < item.price}
                              className={`w-full py-2.5 rounded-xl font-bold transition-all active:scale-95 ${
                                  userData.coins >= item.price 
                                  ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-md' 
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                          >
                              {userData.coins >= item.price ? 'ซื้อเลย' : 'เงินไม่พอ'}
                          </button>
                      </div>
                  ))}
              </div>
          </div>

          {/* Inventory */}
          <div>
              <Card title="กระเป๋าของฉัน" className="h-full bg-teal-50/50 border-teal-100">
                  <div className="flex items-center gap-2 mb-4 text-teal-700">
                      <Briefcase size={20} />
                      <span className="text-sm font-bold">ไอเทมที่ครอบครอง</span>
                  </div>
                  
                  {userData.inventory.length > 0 ? (
                      <div className="space-y-3">
                          {userData.inventory.map((inv, idx) => {
                              const itemDef = SHOP_ITEMS.find(i => i.id === inv.itemId);
                              if (!itemDef) return null;
                              return (
                                  <div key={idx} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                                      <div className="text-2xl">{itemDef.icon}</div>
                                      <div className="flex-1">
                                          <p className="font-bold text-sm text-gray-800">{itemDef.name}</p>
                                          <p className="text-xs text-gray-400">ประเภท: {itemDef.type}</p>
                                      </div>
                                      <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-lg font-bold text-sm">x{inv.count}</span>
                                  </div>
                              );
                          })}
                      </div>
                  ) : (
                      <div className="text-center py-10 text-gray-400">
                          <ShoppingBag size={48} className="mx-auto mb-2 opacity-30" />
                          <p>ยังไม่มีไอเทม</p>
                          <p className="text-xs">ซื้อของเพื่อนำไปใช้ในเกมต่อสู้!</p>
                      </div>
                  )}
              </Card>
          </div>
      </div>
    </div>
  );
};
