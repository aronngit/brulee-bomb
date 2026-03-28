import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';

import { 
  Plus, 
  Minus, 
  QrCode, 
  Star, 
  Flame, 
  CheckCircle2,
  ChevronLeft,
  Info,
  Check,
  Key,
  Bird,
  Lock,
  User,
  Shield,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { 
  generateProductImage, 
  generateLogoImage, 
  generateAICampusLogo, 
  generateISTTSManagementLogo,
  generateHikariLogo,
  resetQuotaFlag
} from './services/imageService';

const FALLBACK_LOGO_URL = "https://picsum.photos/seed/brulee-bomb-logo-accurate/400/400";
const FALLBACK_AI_CAMPUS_URL = "https://picsum.photos/seed/stts-ai-campus-mascot/400/400";
const FALLBACK_ISTTS_URL = "https://picsum.photos/seed/manajemen-bisnis-digital-istts/400/400";
const FALLBACK_PRODUCT_URL = "https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&w=800&q=80";
const QR_CODE_MOCK = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=BruleeBombOrder";



interface OrderHistory {
  id: string;
  date: Date;
  customerName: string;
  menuItem: string;
  quantity: number;
  totalPrice: number;
  sauces: string[];
  status?: string;
  profit?: number;
}

interface Feedback {
  id: string;
  date: Date;
  customerName: string;
  message: string;
  rating: number;
}

export default function App() {
  const [quantity, setQuantity] = useState(1);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'success'>('idle');
  const [paymentMethod, setPaymentMethod] = useState<'qris' | null>(null);
  const [productImage, setProductImage] = useState<string>(FALLBACK_PRODUCT_URL);
  const [logoImage, setLogoImage] = useState<string>(FALLBACK_LOGO_URL);
  const [hikariLogo, setHikariLogo] = useState<string>(FALLBACK_LOGO_URL);
  const [aiCampusLogo, setAiCampusLogo] = useState<string>(FALLBACK_AI_CAMPUS_URL);
  const [isttsLogo, setIsttsLogo] = useState<string>(FALLBACK_ISTTS_URL);
  const [imageError, setImageError] = useState(false);
  const [showBrandInfo, setShowBrandInfo] = useState(false);
  const [userRole, setUserRole] = useState<'customer' | 'admin' | null>(null);
  const [loginView, setLoginView] = useState<'selection' | 'admin'>('selection');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [purchaseHistory, setPurchaseHistory] = useState<OrderHistory[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [selectedMenu, setSelectedMenu] = useState<'Brulee Bomb' | 'Hikari Sushi' | 'Bundle'>('Brulee Bomb');
  const [dailyStock, setDailyStock] = useState<number | null>(null);
  const [adminStockInput, setAdminStockInput] = useState('');
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [adminTab, setAdminTab] = useState<'orders' | 'history' | 'feedback'>('orders');
  const [adminSelectedDate, setAdminSelectedDate] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);

  const [isSocketConnected, setIsSocketConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socket = io({
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsSocketConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsSocketConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsSocketConnected(false);
    });

    socket.on('initial_history', (history: any[]) => {
      const formattedHistory = history.map(item => ({
        ...item,
        date: new Date(item.date)
      }));
      setPurchaseHistory(formattedHistory);
    });

    socket.on('initial_feedback', (data: any[]) => {
      setFeedbacks(data.map(f => ({ ...f, date: new Date(f.date) })));
    });

    socket.on('order_update', (order: any) => {
      const formattedOrder = {
        ...order,
        date: new Date(order.date)
      };
      setPurchaseHistory(prev => [formattedOrder, ...prev]);
    });

    socket.on('new_feedback', (f: any) => {
      setFeedbacks(prev => [{ ...f, date: new Date(f.date) }, ...prev]);
    });

    socket.on('stock_update', (stock: number | null) => {
      setDailyStock(stock);
    });

    socket.on('order_status_update', ({ id, status }: { id: string, status: string }) => {
      setPurchaseHistory(prev => prev.map(order => 
        order.id === id ? { ...order, status } : order
      ));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadLogos = async () => {
    setImageError(false);
    try {
      // Load with minimal stagger to avoid immediate 429 while being much faster
      const stagger = (ms: number) => new Promise(r => setTimeout(r, ms));
      
      const [logo, ai, istts, hikari] = await Promise.all([
        generateLogoImage().catch(() => "https://picsum.photos/seed/brulee-bomb-logo-accurate/400/400"),
        stagger(200).then(() => generateAICampusLogo()).catch(() => "https://picsum.photos/seed/stts-ai-campus-mascot/400/400"),
        stagger(400).then(() => generateISTTSManagementLogo()).catch(() => "https://picsum.photos/seed/manajemen-bisnis-digital-istts/400/400"),
        stagger(600).then(() => generateHikariLogo()).catch(() => "https://picsum.photos/seed/hikari-sushi-logo-accurate/400/400")
      ]);

      setLogoImage(logo);
      setAiCampusLogo(ai);
      setIsttsLogo(istts);
      setHikariLogo(hikari);
      
      // If any of them are fallbacks (contain picsum), set error state to show notification
      if ([logo, ai, istts, hikari].some(url => url.includes('picsum.photos'))) {
        setImageError(true);
      }
    } catch (error) {
      console.error("Error loading logos:", error);
      setImageError(true);
    }
  };

  useEffect(() => {
    loadLogos();
  }, []);

  useEffect(() => {
    const loadProductImage = async () => {
      try {
        const img = await generateProductImage(selectedMenu);
        setProductImage(img);
      } catch (error) {
        console.error("Error loading product image:", error);
        // Fallback images
        setProductImage(selectedMenu === 'Brulee Bomb' 
          ? "https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=800&q=80"
          : "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80"
        );
      }
    };
    loadProductImage();
  }, [selectedMenu]);

  useEffect(() => {
    // Clear invalid sauces when menu changes
    const validSauces = selectedMenu === 'Brulee Bomb' 
      ? ['Saus Sambal', 'Saus Tomat'] 
      : selectedMenu === 'Hikari Sushi'
        ? ['Saus Mayonais', 'Saus Mentai']
        : ['Saus Sambal', 'Saus Tomat', 'Saus Mayonais', 'Saus Mentai'];
    
    setSelectedSauces(prev => prev.filter(s => validSauces.includes(s)));
  }, [selectedMenu]);

  const [selectedSauces, setSelectedSauces] = useState<string[]>([]);

  const pricePerUnit = selectedMenu === 'Hikari Sushi' ? 8000 : selectedMenu === 'Bundle' ? 18000 : 10000;
  const totalPrice = quantity * pricePerUnit;

  const toggleSauce = (sauce: string) => {
    setSelectedSauces(prev => 
      prev.includes(sauce) ? prev.filter(s => s !== sauce) : [...prev, sauce]
    );
  };

  const handleOrder = () => {
    if (!customerName.trim()) return;
    const stockNeeded = selectedMenu === 'Bundle' ? quantity * 2 : quantity;
    if (dailyStock !== null && stockNeeded > dailyStock) {
      alert("Maaf, stok tidak mencukupi untuk pesanan ini.");
      return;
    }
    const newOrder: OrderHistory = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date(),
      customerName: customerName.trim(),
      menuItem: selectedMenu,
      quantity,
      totalPrice,
      sauces: [...selectedSauces],
      status: 'Success'
    };
    
    // Emit to server instead of local setPurchaseHistory
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('new_order', newOrder);
    } else {
      console.warn("Socket not connected, attempting to send order anyway or logging error");
      // Fallback: if not connected, try to reconnect and send
      if (socketRef.current) {
        socketRef.current.connect();
        socketRef.current.emit('new_order', newOrder);
      }
    }
    
    setPaymentMethod('qris');
    setOrderStatus('success');
  };

  const resetOrder = () => {
    setOrderStatus('idle');
    setPaymentMethod(null);
    setQuantity(1);
    setSelectedSauces([]);
    setCustomerName('');
  };

  if (userRole === null) {
    return (
      <div className="flex justify-center min-h-screen bg-bg-cream items-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px] bg-white rounded-[3rem] p-8 shadow-2xl border-4 border-white text-center"
        >
          <div className="flex justify-center gap-4 mb-6">
            <div className="w-20 h-20 logo-glow rounded-full bg-[#FFEC3D] overflow-hidden">
              <img 
                alt="Brulee Bomb Logo" 
                className="w-full h-full mix-blend-multiply" 
                src={logoImage}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_LOGO_URL;
                }}
              />
            </div>
            <div className="w-20 h-20 logo-glow rounded-full bg-white overflow-hidden border-2 border-stone-100">
              <img 
                alt="Hikari Sushi Logo" 
                className="w-full h-full object-cover" 
                src={hikariLogo}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <h1 className="text-3xl font-black text-stone-900 mb-2">Hikari Sushi x Brulee Bomb</h1>
          <p className="text-stone-500 mb-8 font-medium">Please select your login type</p>

          {loginView === 'selection' ? (
            <div className="space-y-4">
              <button 
                onClick={() => setUserRole('customer')}
                className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg shadow-primary/30 flex items-center justify-center space-x-3 hover:bg-primary/90 transition-all"
              >
                <User className="w-5 h-5" />
                <span>Continue as Customer</span>
              </button>
              <button 
                onClick={() => setLoginView('admin')}
                className="w-full bg-white text-stone-700 border-2 border-stone-200 font-black py-4 rounded-2xl flex items-center justify-center space-x-3 hover:bg-stone-50 transition-all"
              >
                <Shield className="w-5 h-5" />
                <span>Login as Admin</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-black text-stone-500 uppercase tracking-widest mb-2">Admin Password</label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-3 pl-12 pr-4 font-medium focus:outline-none focus:border-secondary transition-colors"
                  />
                </div>
                {loginError && <p className="text-red-500 text-xs font-bold mt-2">{loginError}</p>}
              </div>
              <div className="pt-2 space-y-3">
                <button 
                  onClick={() => {
                    if (adminPassword === 'atmin') {
                      setUserRole('admin');
                    } else {
                      setLoginError('Incorrect password');
                    }
                  }}
                  className="w-full bg-secondary text-white font-black py-4 rounded-2xl shadow-lg shadow-secondary/30 flex items-center justify-center space-x-3 hover:bg-secondary/90 transition-all"
                >
                  <span>Login</span>
                </button>
                <button 
                  onClick={() => {
                    setLoginView('selection');
                    setLoginError('');
                    setAdminPassword('');
                  }}
                  className="w-full text-stone-500 font-bold py-2 text-sm hover:text-stone-800 transition-colors"
                >
                  Back
                </button>
              </div>

              {/* Recent Orders Preview for Admin */}
              <div className="mt-8 pt-6 border-t border-stone-100">
                <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <RefreshCw className="w-3 h-3" /> Recent Activity
                </h3>
                <div className="space-y-2">
                  {purchaseHistory.length === 0 ? (
                    <p className="text-[10px] font-bold text-stone-300 italic">No recent orders.</p>
                  ) : (
                    purchaseHistory.slice(0, 3).map((order) => (
                      <div key={order.id} className="flex justify-between items-center p-2 bg-stone-50 rounded-lg border border-stone-100">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-stone-700 uppercase truncate max-w-[100px]">{order.customerName}</span>
                          <span className="text-[8px] font-bold text-stone-400 uppercase">{order.menuItem}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-black text-secondary block">Rp {order.totalPrice.toLocaleString()}</span>
                          <span className="text-[8px] font-bold text-stone-400 uppercase">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (userRole === 'admin') {
    return (
      <div className="flex justify-center min-h-screen bg-bg-cream">
        <div className="w-full max-w-[430px] min-h-screen bg-bg-cream relative flex flex-col p-6">
          <div className="flex justify-between items-center mb-8 pt-6">
            <div>
              <h1 className="text-2xl font-black text-stone-900">Admin Dashboard</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${isSocketConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                  {isSocketConnected ? 'Live Connection Active' : 'Connection Lost - Reconnecting...'}
                </span>
              </div>
            </div>
            <button 
              onClick={() => {
                setUserRole(null);
                setLoginView('selection');
                setAdminPassword('');
              }}
              className="text-sm font-bold text-secondary bg-secondary/10 px-4 py-2 rounded-full"
            >
              Logout
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 mb-6">
            <h3 className="text-sm font-black text-stone-800 mb-4 uppercase tracking-widest flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Admin Controls
            </h3>
            
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-1">Set Daily Stock</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={adminStockInput}
                    onChange={(e) => setAdminStockInput(e.target.value)}
                    placeholder="Enter stock quantity"
                    className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button 
                    onClick={() => {
                      const stock = parseInt(adminStockInput);
                      if (!isNaN(stock) && stock >= 0) {
                        socketRef.current?.emit('set_stock', stock);
                        setAdminStockInput('');
                      }
                    }}
                    className="bg-primary text-white font-bold py-2 px-4 rounded-xl text-xs hover:bg-primary/90 transition-colors"
                  >
                    Set
                  </button>
                </div>
                {dailyStock !== null && (
                  <p className="text-xs font-bold text-stone-500 mt-2">Current Stock: <span className="text-primary">{dailyStock}</span></p>
                )}
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-stone-500">Total Profit (All Time)</span>
                  <span className="text-sm font-black text-secondary">
                    Rp {purchaseHistory.reduce((total, order) => total + (order.profit || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-stone-500">This Month's Profit</span>
                  <span className="text-sm font-black text-primary">
                    Rp {purchaseHistory.reduce((total, order) => {
                      const now = new Date();
                      if (order.date.getMonth() === now.getMonth() && order.date.getFullYear() === now.getFullYear()) {
                        return total + (order.profit || 0);
                      }
                      return total;
                    }, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={async () => {
                  localStorage.clear();
                  resetQuotaFlag();
                  window.location.reload();
                }}
                className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 px-4 rounded-xl text-xs transition-colors"
              >
                Clear Cache & Retry
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => setAdminTab('orders')} 
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${adminTab === 'orders' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white text-stone-500 border border-stone-200'}`}
            >
              Today
            </button>
            <button 
              onClick={() => setAdminTab('history')} 
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${adminTab === 'history' ? 'bg-secondary text-white shadow-lg shadow-secondary/30' : 'bg-white text-stone-500 border border-stone-200'}`}
            >
              History
            </button>
            <button 
              onClick={() => setAdminTab('feedback')} 
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${adminTab === 'feedback' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white text-stone-500 border border-stone-200'}`}
            >
              Feedback
            </button>
          </div>

          {adminTab === 'history' && (
            <div className="mb-4 bg-white p-4 rounded-2xl shadow-sm border border-stone-100">
              <label className="block text-xs font-bold text-stone-500 mb-2">Filter by Date</label>
              <input 
                type="date" 
                value={adminSelectedDate}
                onChange={(e) => setAdminSelectedDate(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {adminSelectedDate && (
                <button 
                  onClick={() => setAdminSelectedDate('')}
                  className="mt-2 text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
          )}

          <div className="flex-grow flex flex-col w-full max-w-md mx-auto space-y-4 overflow-y-auto pb-20">
            {adminTab === 'orders' || adminTab === 'history' ? (
              (() => {
                let filteredHistory = purchaseHistory;
                
                if (adminTab === 'orders') {
                  // Only show today's orders for the "Today" tab
                  const today = new Date();
                  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  filteredHistory = purchaseHistory.filter(order => {
                    const d = order.date;
                    const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return dateString === todayStr;
                  });
                } else if (adminSelectedDate) {
                  // Filter by selected date for the "History" tab
                  filteredHistory = purchaseHistory.filter(order => {
                    const d = order.date;
                    const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    return dateString === adminSelectedDate;
                  });
                }

                return filteredHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center space-y-4 opacity-50 mt-10">
                    <Shield className="w-16 h-16 text-stone-400" />
                    <p className="font-bold text-stone-500">No purchase history yet.</p>
                  </div>
                ) : (
                  filteredHistory.map(order => (
                    <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex flex-col space-y-2">
                      <div className="flex justify-between items-center border-b border-stone-50 pb-2">
                        <span className="text-xs font-bold text-stone-400">
                          {order.date.toLocaleDateString()} {order.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs font-black text-primary uppercase">ID: {order.id}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="font-black text-stone-700">{order.customerName}</span>
                        <span className="text-xs font-bold text-stone-500">{order.menuItem}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-bold text-stone-800">{order.quantity} Portion(s)</span>
                          <span className="text-xs text-stone-500">{order.sauces.length > 0 ? order.sauces.join(', ') : 'No Sauce'}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-black text-secondary">Rp {order.totalPrice.toLocaleString()}</span>
                          <span className="text-xs font-bold text-green-600">Profit: Rp {(order.profit || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="pt-2 mt-2 border-t border-stone-50 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Status</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full ${order.status === 'Pending' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                            {order.status || 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                );
              })()
            ) : (
              feedbacks.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center space-y-4 opacity-50 mt-10">
                  <Star className="w-16 h-16 text-stone-400" />
                  <p className="font-bold text-stone-500">Belum ada saran & kritik.</p>
                </div>
              ) : (
                feedbacks.map(f => (
                  <div key={f.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex flex-col space-y-2">
                    <div className="flex justify-between items-center border-b border-stone-50 pb-2">
                      <span className="text-xs font-bold text-stone-400">
                        {f.date.toLocaleDateString()} {f.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < f.rating ? 'fill-yellow-400 text-yellow-400' : 'text-stone-200'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-black text-stone-700">{f.customerName}</span>
                    </div>
                    <p className="text-sm text-stone-600 mt-2 whitespace-pre-wrap">{f.message}</p>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  if (orderStatus === 'success') {
    return (
      <div className="flex justify-center min-h-screen bg-bg-cream">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[430px] flex flex-col items-center justify-center px-6 text-center"
        >
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border-4 border-white w-full">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
            >
              <CheckCircle2 className="w-24 h-24 text-primary mx-auto mb-6" />
            </motion.div>
            <h2 className="text-3xl font-black mb-2">Order Placed!</h2>
            <p className="text-stone-600 mb-6">
              Your {quantity} portion{quantity > 1 ? 's' : ''} {selectedMenu === 'Bundle' ? '(1x5 Brulee + 1x6 Hikari)' : `(${quantity * 5} pcs)`} of {selectedMenu} are being prepared.
            </p>
            
            <div className="bg-bg-cream/50 p-6 rounded-2xl mb-8 border-2 border-stone-100 text-left">
              <div className="flex justify-between mb-2">
                <span className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Customer</span>
                <span className="font-black text-stone-800 uppercase text-[10px] tracking-widest">
                  {customerName}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Payment Method</span>
                <span className="font-black text-secondary uppercase text-[10px] tracking-widest">
                  Order Payment
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Sauces</span>
                <span className="font-black text-stone-800 uppercase text-[10px] tracking-widest">
                  {selectedSauces.length > 0 ? selectedSauces.join(', ') : 'No Sauce'}
                </span>
              </div>
              <div className="h-px bg-stone-200 my-3"></div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold uppercase text-[10px] tracking-widest">Total Amount</span>
                <span className="font-black text-primary text-xl">Rp {totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <button 
              onClick={resetOrder}
              className="w-full bg-secondary text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-secondary/20 flex items-center justify-center space-x-2 uppercase tracking-widest"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back to Order</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex justify-center min-h-screen bg-bg-cream">
      {/* Quota Error Notification */}
      {imageError && (
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-3 text-sm font-medium"
        >
          <span>Beberapa logo gagal dimuat (Quota Limit)</span>
          <button 
            onClick={() => loadLogos()}
            className="bg-white text-red-500 px-3 py-1 rounded-full hover:bg-red-50"
          >
            Coba Lagi
          </button>
        </motion.div>
      )}
      <div className="w-full max-w-[430px] min-h-screen bg-bg-cream relative overflow-x-hidden flex flex-col">
        {/* Header / Logo Section */}
        <div className="px-6 pt-12 pb-6 relative text-center">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none overflow-hidden">
            <Flame className="w-[200px] h-[200px] text-primary absolute -top-10 -left-20 rotate-12" />
            <Flame className="w-[150px] h-[150px] text-secondary absolute top-40 -right-10 -rotate-12" />
          </div>
          
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="flex justify-center gap-4 relative group">
              <button 
                onClick={() => {
                  resetQuotaFlag();
                  loadLogos();
                }}
                className="absolute -top-8 right-0 p-2 bg-white/50 rounded-full hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
                title="Refresh Logos"
              >
                <RefreshCw className="w-4 h-4 text-secondary" />
              </button>
              <div className="w-24 h-24 logo-glow rounded-full bg-[#FFEC3D] overflow-hidden">
                <img 
                  alt="Brulee Bomb Logo" 
                  className="w-full h-full mix-blend-multiply" 
                  src={logoImage}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_LOGO_URL;
                  }}
                />
              </div>
              <div className="w-24 h-24 logo-glow rounded-full bg-white overflow-hidden border-2 border-stone-100">
                <img 
                  alt="Hikari Sushi Logo" 
                  className="w-full h-full object-cover" 
                  src={hikariLogo}
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </motion.div>

          <div className="absolute top-12 left-6 z-30 flex items-center gap-3">
            {/* ISTTS Management Logo */}
            <div className="w-12 h-12 bg-white rounded-xl shadow-md border border-stone-100 flex items-center justify-center p-0.5 overflow-hidden">
              <img 
                src={isttsLogo} 
                alt="ISTTS Management Logo" 
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_ISTTS_URL;
                }}
              />
            </div>

            {/* AI Campus Logo Mascot */}
            <div className="w-12 h-12 bg-white rounded-xl shadow-md border border-stone-100 flex items-center justify-center p-0.5 overflow-hidden">
              <img 
                src={aiCampusLogo} 
                alt="AI Campus Logo" 
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_AI_CAMPUS_URL;
                }}
              />
            </div>
          </div>

          <div className="absolute top-12 right-6 z-30 flex flex-col gap-3">
            <button 
              onClick={() => {
                setUserRole(null);
                setLoginView('selection');
              }}
              className="p-2 bg-white/80 rounded-full shadow-md hover:bg-white transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5 text-stone-600" />
            </button>
            <button 
              onClick={() => setShowBrandInfo(true)}
              className="p-2 bg-white/80 rounded-full shadow-md hover:bg-white transition-colors"
              title="Brand Info"
            >
              <Info className="w-5 h-5 text-secondary" />
            </button>
          </div>
        </div>

        {/* Main Product Card */}
        <div className="flex-grow px-5 z-20 mb-6">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-[3rem] shadow-2xl overflow-hidden border-4 border-white"
          >
            {/* Product Image */}
            <div className="relative h-64 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img 
                  key={selectedMenu}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  alt={`Delicious ${selectedMenu}`} 
                  className="w-full h-full object-cover scale-105" 
                  src={productImage}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_URL;
                  }}
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-4 left-6 flex items-center gap-2">
                <span className="bg-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                  <Star className="w-3 h-3 fill-white" />
                  Signature Recipe
                </span>
              </div>
            </div>

            {/* Product Info */}
            <div className="p-8">
              <div className="mb-6">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-10 h-[3px] bg-accent rounded-full"></span> Pilih Menu
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {['Brulee Bomb', 'Hikari Sushi', 'Bundle'].map((menu) => (
                    <button
                      key={menu}
                      onClick={() => setSelectedMenu(menu as any)}
                      className={`flex items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                        selectedMenu === menu
                          ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                          : 'bg-white text-stone-600 border-stone-100'
                      }`}
                    >
                      <span className="font-black text-[10px]">{menu}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-black text-stone-900 leading-none tracking-tight">{selectedMenu}</h2>
                  <p className="text-secondary font-bold text-lg mt-2 tracking-tight italic">
                    {selectedMenu === 'Brulee Bomb' 
                      ? 'Cheese & Sausage Filled' 
                      : selectedMenu === 'Hikari Sushi'
                        ? 'Sushi berisi ayam nugget dan timun'
                        : '1 Porsi Brulee Bomb (5 pcs) + 1 Porsi Hikari Sushi (6 pcs)'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-primary font-black text-2xl leading-none">Rp {pricePerUnit.toLocaleString()}</p>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                    {selectedMenu === 'Bundle' ? 'Per Bundle' : 'Per 5 Pcs'}
                  </p>
                </div>
              </div>

              {/* Customer Name */}
              <div className="mb-6">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-10 h-[3px] bg-accent rounded-full"></span> Nama Customer
                </h3>
                <div className="relative">
                  <User className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Masukkan nama Anda"
                    className="w-full bg-stone-50 border-2 border-stone-200 rounded-xl py-3 pl-12 pr-4 font-medium focus:outline-none focus:border-secondary transition-colors"
                  />
                </div>
              </div>

              {/* Sauce Options */}
              <div className="mb-8">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-10 h-[3px] bg-accent rounded-full"></span> Pilih Saus
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {(selectedMenu === 'Brulee Bomb' 
                    ? ['Saus Sambal', 'Saus Tomat'] 
                    : selectedMenu === 'Hikari Sushi'
                      ? ['Saus Mayonais', 'Saus Mentai']
                      : ['Saus Sambal', 'Saus Tomat', 'Saus Mayonais', 'Saus Mentai']
                  ).map((sauce) => (
                    <button
                      key={sauce}
                      onClick={() => toggleSauce(sauce)}
                      className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                        selectedSauces.includes(sauce)
                          ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/20'
                          : 'bg-white text-stone-600 border-stone-100'
                      }`}
                    >
                      <span className="font-bold text-sm">{sauce}</span>
                      {selectedSauces.includes(sauce) && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="mb-2 flex justify-between items-center">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-10 h-[3px] bg-accent rounded-full"></span> Jumlah Pesanan
                </h3>
                {dailyStock !== null && (
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                    Sisa Stok: {dailyStock}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between bg-accent/10 p-4 rounded-[2rem] border-2 border-accent/20">
                <div className="flex flex-col ml-2">
                  <span className="font-black text-stone-800 uppercase tracking-widest text-[10px]">Jumlah Porsi</span>
                  <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">(1 porsi = 5 pcs)</span>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 rounded-2xl bg-white border-2 border-accent text-secondary flex items-center justify-center active:scale-90 transition-transform shadow-md"
                  >
                    <Minus className="w-6 h-6" />
                  </button>
                  <span className="text-2xl font-black text-stone-900 min-w-[24px] text-center">{quantity}</span>
                  <button 
                    onClick={() => {
                      if (dailyStock === null || quantity < dailyStock) {
                        setQuantity(quantity + 1);
                      } else {
                        alert("Maaf, stok tidak mencukupi.");
                      }
                    }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform shadow-lg ${dailyStock !== null && quantity >= dailyStock ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-primary text-white active:scale-90 shadow-primary/40'}`}
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Payment Buttons */}
        <div className="px-6 space-y-4 pb-8">
          <motion.button 
            whileTap={{ scale: customerName.trim() ? 0.97 : 1 }}
            onClick={handleOrder}
            disabled={!customerName.trim() || (dailyStock !== null && quantity > dailyStock)}
            className={`w-full font-black py-5 rounded-[1.5rem] shadow-2xl flex items-center justify-center space-x-3 transition-all ${
              customerName.trim() && (dailyStock === null || quantity <= dailyStock)
                ? 'bg-secondary hover:bg-red-700 text-white shadow-secondary/30' 
                : 'bg-stone-300 text-stone-500 cursor-not-allowed'
            }`}
          >
            <span className="tracking-widest text-lg uppercase">Pay Order - Rp {totalPrice.toLocaleString()}</span>
          </motion.button>
        </div>

        {/* Recent Orders Section */}
        <div className="px-6 pb-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-stone-800 uppercase tracking-widest flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary" /> Pesanan Terbaru
              </h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Live</span>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {purchaseHistory.length === 0 ? (
                <p className="text-xs font-bold text-stone-400 text-center py-4 italic">Belum ada pesanan hari ini.</p>
              ) : (
                purchaseHistory.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-stone-800 uppercase tracking-tight">{order.customerName}</span>
                      <span className="text-[9px] font-bold text-stone-400 uppercase">{order.menuItem} • {order.quantity} Porsi</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-primary">Rp {order.totalPrice.toLocaleString()}</span>
                      <span className="text-[8px] font-bold text-stone-400 uppercase">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            {purchaseHistory.length > 5 && (
              <p className="text-[9px] font-bold text-stone-400 text-center mt-3 uppercase tracking-widest opacity-60">
                + {purchaseHistory.length - 5} pesanan lainnya
              </p>
            )}
          </div>
        </div>

        {/* Feedback Section */}
        <div className="px-6 pb-12">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
            <h3 className="text-sm font-black text-stone-800 mb-4 uppercase tracking-widest flex items-center gap-2">
              <Star className="w-4 h-4 text-secondary" /> Saran & Kritik
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setFeedbackRating(star)}
                    className="focus:outline-none transition-transform active:scale-90"
                  >
                    <Star
                      className={`w-8 h-8 transition-all ${
                        star <= feedbackRating ? 'fill-yellow-400 text-yellow-400 scale-110' : 'text-stone-200 hover:text-stone-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Bagikan pengalaman Anda atau berikan saran untuk kami..."
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl p-4 min-h-[120px] font-medium focus:outline-none focus:border-secondary transition-colors resize-none"
              />
              <button
                onClick={() => {
                  if (feedbackMessage.trim() && customerName.trim()) {
                    const newFeedback = {
                      id: Math.random().toString(36).substr(2, 9),
                      date: new Date().toISOString(),
                      customerName: customerName.trim(),
                      message: feedbackMessage.trim(),
                      rating: feedbackRating
                    };
                    socketRef.current?.emit('submit_feedback', newFeedback);
                    setFeedbackMessage('');
                    setFeedbackRating(5);
                    alert('Terima kasih atas saran & kritik Anda!');
                  } else if (!customerName.trim()) {
                    alert('Mohon isi nama Anda di form pemesanan terlebih dahulu.');
                  }
                }}
                disabled={!feedbackMessage.trim() || !customerName.trim()}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                  feedbackMessage.trim() && customerName.trim()
                    ? 'bg-secondary text-white hover:bg-secondary/90'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                Kirim Saran
              </button>
            </div>
          </div>
        </div>

        {/* Brand Info Modal */}
        <AnimatePresence>
          {showBrandInfo && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowBrandInfo(false)}
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-white rounded-[3rem] p-8 max-w-[380px] shadow-2xl border-4 border-white"
                onClick={e => e.stopPropagation()}
              >
                <h2 className="text-2xl font-black text-secondary mb-4 uppercase tracking-tight">Our Brand Story</h2>
                <p className="text-stone-600 leading-relaxed mb-6">
                  Founded on the belief that snacks should be an experience, Brulee Bomb brings you the perfect harmony of textures. Our chefs spent months perfecting the ratio of crispy breading to molten cheese.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Star className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-black text-stone-800 text-sm uppercase">Premium Ingredients</h4>
                      <p className="text-xs text-stone-500">We use only the finest mozzarella and smoked beef sausage.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="bg-secondary/10 p-2 rounded-lg">
                      <Flame className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h4 className="font-black text-stone-800 text-sm uppercase">Hand-Rolled Daily</h4>
                      <p className="text-xs text-stone-500">Every single bomb is hand-crafted to ensure the perfect shape and seal.</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBrandInfo(false)}
                  className="w-full mt-8 bg-stone-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-sm"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Indicator */}
        <div className="h-8 flex justify-center items-center w-full mt-auto">
          <div className="w-32 h-1.5 bg-stone-300/50 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}


