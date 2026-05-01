import { useState, useEffect, ChangeEvent, Fragment } from 'react';
import { 
  Plus, 
  Search, 
  Image as ImageIcon, 
  User, 
  LogIn, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  Camera,
  MapPin,
  Phone,
  ExternalLink,
  Download,
  Copy,
  Eye,
  ArrowRightLeft,
  LayoutGrid,
  Heart,
  Share2,
  Filter
} from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  orderBy,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  getDocFromServer,
  arrayUnion
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { cn, handleFirestoreError, OperationType, copyToClipboard } from './lib/utils';
import { Photo, PhotoCategory, UserProfile, PromptLibraryItem } from './types/index';
import { motion, AnimatePresence } from 'motion/react';

// --- Connection Test ---
async function testConnection() {
  try {
    // Attempt to fetch a non-existent doc from server to verify connection
    await getDocFromServer(doc(db, '_internal_', 'connection_test'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firestore is offline. Please check your Firebase configuration or internet connection.");
    }
  }
}
testConnection();

// --- Helpers ---
const toBase64 = (file: File): Promise<string> => 
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 1000): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% quality
    };
  });
};

// --- Mock Ad Component ---
const AdMock = ({ size = 'rect' }: { size?: 'rect' | 'banner' | 'card' | 'row' }) => (
  <div className={cn(
    "bg-slate-900/40 border border-dashed border-slate-700 flex flex-col items-center justify-center p-4 rounded-2xl",
    size === 'banner' ? "w-full h-32 my-8" : 
    size === 'card' ? "aspect-[4/5] w-full" :
    size === 'row' ? "w-full min-h-[100px] sm:min-h-[80px]" :
    "w-full aspect-[4/3]"
  )}>
    <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400 mb-2">Sponsored Content</span>
    <div className="w-full h-full bg-slate-800/50 rounded-lg border border-slate-700 flex flex-col items-center justify-center p-2 text-center">
       <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Google AdSense Placeholder</div>
       <div className="w-12 h-1 bg-slate-700 mt-2 rounded mx-auto"></div>
    </div>
  </div>
);

// --- Component: Video Ad Simulation ---
const VideoAdModal = ({ isOpen, onClose, onComplete }: { isOpen: boolean, onClose: () => void, onComplete: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(10);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, timeLeft]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-4">
      <div className="max-w-lg w-full bg-slate-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="relative aspect-video bg-black flex items-center justify-center flex-shrink-0">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full border-4 border-t-blue-500 border-white/10 animate-spin" />
            <p className="text-white font-medium text-lg">Watching Video Ad...</p>
          </div>
          <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
            {timeLeft}s
          </div>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold text-white mb-2">Almost there!</h3>
          <p className="text-gray-400 text-sm mb-6">
            Continue to Auto-Copy & Open Gemini.
          </p>
          <button 
            disabled={timeLeft > 0}
            onClick={() => {
              onComplete();
              onClose();
            }}
            className="w-full py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black hover:bg-gray-200"
          >
            {timeLeft > 0 ? "Watch to continue" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Component: Before After Slider ---
const BeforeAfterSlider = ({ before, after }: { before: string, after: string }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleMove = (e: any) => {
    if (!isDragging) return;
    
    const container = e.currentTarget.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const position = ((x - container.left) / container.width) * 100;
    
    setSliderPos(Math.max(0, Math.min(100, position)));
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden cursor-ew-resize select-none"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
    >
      {/* After image (background) */}
      <img src={after} className="absolute inset-0 w-full h-full object-cover" alt="After" />
      
      {/* Before image (overlay clip) */}
      <div 
        className="absolute inset-0 w-full h-full overflow-hidden border-r-2 border-white shadow-[2px_0_10px_rgba(0,0,0,0.5)] z-10"
        style={{ width: `${sliderPos}%` }}
      >
        <div style={{ width: `${(100 / sliderPos) * 100}%`, height: '100%', position: 'absolute', top: 0, left: 0 }}>
             <img src={before} className="w-full h-full object-cover" alt="Before" />
        </div>
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center border border-slate-200">
          <ArrowRightLeft size={14} className="text-slate-900" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-none opacity-60">
         <span className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-bold text-white border border-white/10 uppercase tracking-widest">Before</span>
      </div>
      <div className="absolute bottom-4 right-4 z-20 pointer-events-none opacity-60">
         <span className="bg-indigo-600/60 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-bold text-white border border-white/10 uppercase tracking-widest">After</span>
      </div>
    </div>
  );
};

// --- Component: Photo Card ---
const PhotoCard = ({ photo, onAction, isLiked }: { photo: Photo, onAction: (p: Photo, action: 'prompt' | 'like' | 'share') => void, isLiked: boolean }) => {
  return (
    <div className="bento-card group flex flex-col">
      <div className="relative overflow-hidden aspect-[4/5] bg-slate-950">
        <BeforeAfterSlider before={photo.beforePhotoUrl} after={photo.afterPhotoUrl} />
        
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <span className="text-slate-400 text-[9px] font-bold backdrop-blur-md px-2 py-1 rounded-md bg-slate-950/40 uppercase tracking-widest border border-white/10">
            {photo.category.replace('-', ' ')}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-[10px]">
            {photo.userName.charAt(0)}
          </div>
          <p className="text-xs font-semibold text-slate-300 tracking-tight">{photo.userName}</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => onAction(photo, 'like')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-[10px] font-bold border",
              isLiked 
                ? "bg-rose-600 text-white border-rose-500" 
                : "bg-slate-800 text-rose-400 border-slate-700 hover:border-rose-500 group/like"
            )}
          >
            <Heart size={14} className={cn("transition-all", (isLiked || photo.likesCount > 0) && "fill-current")} />
            <span className="tabular-nums">{photo.likesCount || 0}</span>
          </button>
          
          <button 
            onClick={() => onAction(photo, 'prompt')}
            className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all text-[10px] font-bold border border-indigo-500 shadow-lg shadow-indigo-500/10 group/btn"
          >
            <Sparkles size={14} className="group-hover/btn:animate-pulse" /> Copy Master Prompt
          </button>

          <button 
            onClick={() => onAction(photo, 'share')}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-white hover:text-slate-950 transition-all border border-slate-700 hover:border-white"
            title="Share on Social Media"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'gallery' | 'prompts' | 'vendors'>('gallery');
  const [categoryFilter, setCategoryFilter] = useState<PhotoCategory | 'all'>('all');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [prompts, setPrompts] = useState<PromptLibraryItem[]>([]);
  const [vendors, setVendors] = useState<UserProfile[]>([]);
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ photo?: Photo, type: string, data?: string } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Auth Effect
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userPath = `users/${u.uid}`;
        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Anonymous',
              photoURL: u.photoURL || '',
              email: u.email || '',
              isVendor: false
            };
            try {
              await setDoc(doc(db, 'users', u.uid), newProfile);
              setProfile(newProfile);
            } catch (err) {
              console.error("Failed to create profile (offline?)", err);
              // Set local profile anyway so the app works in offline mode
              setProfile(newProfile);
            }
          }
        } catch (e) {
          console.warn("Failed to fetch profile (offline?)", e);
          // If we can't get it, we'll try again later or assume local state
        }
      } else {
        setProfile(null);
      }
    });
  }, []);

  // Data Effects
  useEffect(() => {
    // Photos
    const photosQuery = categoryFilter === 'all' 
      ? query(collection(db, 'photos'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'photos'), where('category', '==', categoryFilter), orderBy('createdAt', 'desc'));
    
    const unsubPhotos = onSnapshot(photosQuery, (snapshot) => {
      setPhotos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Photo)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'photos'));

    // Vendors
    const vendorsQuery = query(collection(db, 'users'), where('isVendor', '==', true));
    const unsubVendors = onSnapshot(vendorsQuery, (snapshot) => {
      setVendors(snapshot.docs.map(d => d.data() as UserProfile));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    // Prompts
    const promptsQuery = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'));
    const unsubPrompts = onSnapshot(promptsQuery, (snapshot) => {
      setPrompts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PromptLibraryItem)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'prompts'));

    return () => {
      unsubPhotos();
      unsubVendors();
      unsubPrompts();
    };
  }, [categoryFilter]);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      if (e.code === 'auth/cancelled-popup-request') {
        console.log("Login popup cancelled by user or another request.");
      } else {
        console.error("Login Error", e);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePhotoAction = async (photo: Photo, type: 'prompt' | 'like' | 'share') => {
    if (type === 'like') {
      if (!user) {
        handleLogin();
        return;
      }
      
      const isAlreadyLiked = profile?.likedPhotos?.includes(photo.id);
      if (isAlreadyLiked) return;

      try {
        const photoRef = doc(db, 'photos', photo.id);
        const userRef = doc(db, 'users', user.uid);

        await updateDoc(photoRef, {
          likesCount: increment(1)
        });
        
        await updateDoc(userRef, {
          likedPhotos: arrayUnion(photo.id)
        });

        // Optimistically update local profile state
        setProfile(prev => prev ? {
          ...prev,
          likedPhotos: [...(prev.likedPhotos || []), photo.id]
        } : null);

      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `photos/${photo.id}`);
      }
      return;
    }

    if (type === 'share') {
      const shareData = {
        title: 'Check out this AI Transformation on VisionMaster!',
        text: `Behold this ${photo.category} transformation by ${photo.userName}. Master Prompt available!`,
        url: window.location.href,
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          // Fallback to copy link
          const success = await copyToClipboard(window.location.href);
          if (success) {
            alert("Gallery link copied! Share it on your social media.");
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('Share canceled by user.');
        } else {
          console.error('Share failure:', err);
          // Fallback to clipboard if share fails (sometimes happens in iframes)
          const success = await copyToClipboard(window.location.href);
          if (success) {
             alert("Share failed, but link was copied to clipboard instead.");
          }
        }
      }
      return;
    }

    setPendingAction({ photo, type });
    setShowAdModal(true);
  };

  const onAdComplete = () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'prompt' && pendingAction.photo) {
      copyToClipboard(pendingAction.photo.masterPrompt);
      window.open('https://gemini.google.com/', '_blank');
    } else if (pendingAction.type === 'libraryPrompt' && pendingAction.data) {
       copyToClipboard(pendingAction.data);
       window.open('https://gemini.google.com/', '_blank');
    }
    setPendingAction(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Vision<span className="text-indigo-400">Master</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <button className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-700 transition-all shadow-inner">
              <Search size={14} />
            </button>

            <a href="https://gemini.google.com" target="_blank" className="bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-full text-[10px] font-bold flex items-center gap-2 transition-all border border-slate-700 text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] hidden xs:block"></div> Gemini
            </a>

            {user ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="bg-indigo-600 text-white px-3 sm:px-5 h-9 sm:h-10 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg active:scale-95"
                >
                  <Plus size={16} /> <span className="hidden sm:inline">Upload</span>
                </button>
                <button 
                  onClick={() => setShowProfileModal(true)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-800 p-0.5"
                >
                  <img src={user.photoURL || ''} className="w-full h-full rounded-full grayscale hover:grayscale-0 transition-all" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-indigo-600 text-white px-4 sm:px-5 h-9 sm:h-10 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-4 pb-6 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 relative z-10">
          {/* Unified AI Mastery Hub */}
          <div className="col-span-12 bento-card p-1 items-stretch overflow-hidden bg-slate-900/50">
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              {/* Branding Section - Now Centered & Expanded */}
              <div className="w-full h-full p-8 md:p-12 bg-gradient-to-br from-indigo-600 to-indigo-800 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <div className="relative z-10 max-w-2xl">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white font-bold text-[10px] uppercase tracking-widest mb-4 border border-white/20"
                  >
                    <Sparkles size={12} /> AI Vision Portal
                  </motion.div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 relative z-10 w-full max-w-md">
                  <button 
                    onClick={() => setActiveTab('gallery')}
                    className="flex-1 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 group/btn"
                  >
                    <ArrowRightLeft size={20} className="group-hover/btn:rotate-180 transition-transform duration-500" /> 
                    Explore Community Gallery
                  </button>
                  <button 
                    onClick={() => setActiveTab('prompts')}
                    className="flex-1 py-4 bg-white text-indigo-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3 backdrop-blur-md"
                  >
                    <Sparkles size={20} /> Access Prompt Library
                  </button>
                </div>

                <div className="flex flex-col gap-4 relative z-10 w-full max-w-md mt-2">
                  <div className="relative group/coming">
                    <button 
                      disabled
                      className="w-full py-4 bg-slate-900/40 text-slate-500 rounded-2xl font-bold text-sm border border-slate-800/50 flex items-center justify-center gap-3 cursor-not-allowed"
                    >
                      <User size={20} /> Order Vendor or Artist
                    </button>
                    <div className="absolute -top-2 -right-2 bg-indigo-500 text-[8px] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shadow-lg">Coming Soon</div>
                  </div>
                </div>


                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                   <div className="absolute top-10 right-10 w-60 h-60 bg-white rounded-full blur-[100px] animate-pulse" />
                   <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-400 rounded-full blur-[120px]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] -z-0 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] -z-0" />
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 pb-20">
        {/* Gallery View */}
        {activeTab === 'gallery' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
                {(['all', 'human-restoration', 'building-decoration', 'other'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      "px-6 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border",
                      categoryFilter === cat 
                        ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                        : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                    )}
                  >
                    {cat === 'all' && <Filter size={12} />}
                    <span className="capitalize">{cat.replace('-', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {photos.map((photo, idx) => (
                <Fragment key={photo.id}>
                  <PhotoCard 
                    photo={photo} 
                    onAction={handlePhotoAction} 
                    isLiked={profile?.likedPhotos?.includes(photo.id) || false} 
                  />
                  {/* Google Adsense mock every 3 items as requested - now same size as photo card */}
                  {(idx + 1) % 3 === 0 && (
                    <AdMock size="card" />
                  )}
                </Fragment>
              ))}
              {photos.length === 0 && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
                  <ImageIcon size={48} className="mb-4 opacity-50" />
                  <p className="text-xl font-bold">No creations found yet</p>
                  <p className="text-sm">Be the first to upload an AI transformation!</p>
                </div>
              )}
            </div>
            <AdMock size="banner" />
          </div>
        )}

        {/* Prompts Library */}
        {activeTab === 'prompts' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bento-card p-12 mb-12 text-center bg-gradient-to-br from-slate-900 to-slate-950">
              <h2 className="text-3xl font-black mb-4 tracking-tighter">Master Prompt Library</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {prompts.map((p, idx) => (
                <div key={p.id} className="flex flex-col gap-4">
                  <div className="bento-card p-5 group flex items-center justify-between hover:bg-slate-800/40">
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400">
                        {p.category}
                      </span>
                      <h3 className="font-bold text-slate-200 text-sm tracking-tight truncate">{p.title}</h3>
                      <p className="text-[10px] text-slate-500 font-mono truncate max-w-[200px] sm:max-w-xs italic">{p.prompt}</p>
                    </div>
                    <button 
                      onClick={() => { 
                        setPendingAction({ type: 'libraryPrompt', data: p.prompt }); 
                        setShowAdModal(true); 
                      }}
                      className="flex items-center gap-2 px-6 py-2.5 bg-slate-800 text-slate-200 rounded-xl font-bold hover:bg-indigo-600 hover:text-white transition-all text-[10px] border border-slate-700 active:scale-95 shadow-lg group-hover:border-indigo-500 flex-shrink-0"
                    >
                      <Copy size={14} /> Copy Master Prompt
                    </button>
                  </div>
                  {/* Google Adsense mock every 3 items - now same size as prompt labels */}
                  {(idx + 1) % 3 === 0 && (
                    <AdMock size="row" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vendor Marketplace */}
        {activeTab === 'vendors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vendors.map((v) => (
              <div key={v.uid} className="bento-card p-6 flex flex-col bg-gradient-to-br from-slate-900 to-indigo-950/20">
                <div className="flex items-center gap-4 mb-6">
                  <img src={v.photoURL} className="w-14 h-14 rounded-2xl object-cover border border-slate-800" />
                  <div>
                    <h3 className="font-bold text-lg tracking-tight text-slate-100">{v.displayName}</h3>
                    <div className="flex items-center gap-1 text-slate-500 text-[10px] mt-1 font-bold uppercase tracking-widest">
                      <MapPin size={10} /> {v.vendorProfile?.location || 'Global'}
                    </div>
                  </div>
                </div>
                <div className="mb-6 flex-1">
                  <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed font-medium italic">
                    "{v.vendorProfile?.description || 'Ready to transform your vision with AI precision.'}"
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {v.vendorProfile?.services?.map(s => (
                      <span key={s} className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-md text-[10px] font-bold uppercase tracking-tighter border border-indigo-500/20">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-6 border-t border-slate-800">
                   <a 
                    href={`tel:${v.vendorProfile?.contact}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-[10px] hover:bg-white hover:text-slate-950 transition-all border border-slate-700"
                   >
                     <Phone size={14} /> Contact
                   </a>
                   <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 text-white font-bold text-[10px] hover:bg-indigo-500 transition-all">
                     View Services
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals & Overlays */}
      <VideoAdModal 
        isOpen={showAdModal} 
        onClose={() => setShowAdModal(false)} 
        onComplete={onAdComplete} 
      />

      <UploadModal 
        isOpen={showUploadModal} 
        onClose={() => setShowUploadModal(false)}
        user={user} 
      />

      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        profile={profile}
        onSave={(p) => setProfile(p)}
      />

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 items-start">
             <div className="md:col-span-4 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-lg font-bold tracking-tight">VisionMaster</span>
                </div>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  The intersection of AI creativity and professional restoration. We connect visionaries with the world's best AI artists.
                </p>
                <div className="flex gap-4">
                   <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 transition-colors cursor-pointer">
                      <Search size={16} />
                   </div>
                   <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 transition-colors cursor-pointer">
                      <MapPin size={16} />
                   </div>
                </div>
             </div>

             <div className="md:col-span-4 flex flex-col items-center md:items-start">
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-6">Our Impact</div>
                <div className="flex items-center gap-6">
                   <div className="text-center md:text-left">
                      <div className="text-3xl font-black text-white">12k+</div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Daily Creations</div>
                   </div>
                   <div className="w-px h-12 bg-slate-800"></div>
                   <div className="flex -space-x-3">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-4 border-slate-950 bg-slate-800 overflow-hidden">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="User" />
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-full border-4 border-slate-950 bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white">
                        400+
                      </div>
                   </div>
                </div>
             </div>

             <div className="md:col-span-4 grid grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Navigation</div>
                   <ul className="space-y-2 text-xs font-bold text-slate-500">
                      <li><button onClick={() => setActiveTab('gallery')} className="hover:text-indigo-400">Gallery</button></li>
                      <li><button onClick={() => setActiveTab('prompts')} className="hover:text-indigo-400">Prompts</button></li>
                      <li><button onClick={() => setActiveTab('vendors')} className="hover:text-indigo-400">Marketplace</button></li>
                   </ul>
                </div>
                <div className="space-y-4">
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resources</div>
                   <ul className="space-y-2 text-xs font-bold text-slate-500">
                      <li><a href="https://gemini.google.com" target="_blank" className="hover:text-indigo-400 flex items-center gap-1">Gemini AI <ExternalLink size={10} /></a></li>
                      <li><a href="#" className="hover:text-indigo-400">Community</a></li>
                      <li><a href="#" className="hover:text-indigo-400">Security</a></li>
                   </ul>
                </div>
             </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold text-slate-600">
            <div className="flex items-center gap-2">
               <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
               SYSTEMS OPERATIONAL
            </div>
            <div>
              © 2026 AI VISIONMASTER PLATFORM • BUILT FOR ARTISTS
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Component: Upload Modal ---
function UploadModal({ isOpen, onClose, user }: { isOpen: boolean, onClose: () => void, user: FirebaseUser | null }) {
  const [uploadType, setUploadType] = useState<'transformation' | 'prompt-only' | null>(null);
  const [step, setStep] = useState(0); // 0 is selection
  const [category, setCategory] = useState<PhotoCategory | string>('human-restoration');
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string>('');
  const [afterPreview, setAfterPreview] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [promptTitle, setPromptTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (file) {
      const b64 = await toBase64(file);
      const compressed = await compressImage(b64);
      if (type === 'before') {
        setBeforeFile(file);
        setBeforePreview(compressed);
      } else {
        setAfterFile(file);
        setAfterPreview(compressed);
      }
    }
  };

  const handleUpload = async () => {
    if (!user) return;

    if (uploadType === 'transformation') {
      if (!beforePreview || !afterPreview || !prompt) return;
      setIsUploading(true);
      try {
        await addDoc(collection(db, 'photos'), {
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          category,
          beforePhotoUrl: beforePreview,
          afterPhotoUrl: afterPreview,
          masterPrompt: prompt,
          createdAt: serverTimestamp(),
          likesCount: 0
        });
        resetAndClose();
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'photos');
      } finally {
        setIsUploading(false);
      }
    } else if (uploadType === 'prompt-only') {
      if (!prompt || !promptTitle) return;
      setIsUploading(true);
      try {
        await addDoc(collection(db, 'prompts'), {
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          title: promptTitle,
          prompt: prompt,
          category: category === 'human-restoration' ? 'Human' : category === 'building-decoration' ? 'Architecture' : 'Other',
          createdAt: serverTimestamp(),
        });
        resetAndClose();
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'prompts');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const resetAndClose = () => {
    onClose();
    setStep(0);
    setUploadType(null);
    setBeforeFile(null);
    setAfterFile(null);
    setBeforePreview('');
    setAfterPreview('');
    setPrompt('');
    setPromptTitle('');
    setCategory('human-restoration');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[95vh]"
      >
        <div className="p-5 sm:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-black tracking-tighter">
            {step === 0 ? "Share Your Work" : uploadType === 'transformation' ? "Transformation Details" : "Prompt Details"}
          </h2>
          <button onClick={resetAndClose} className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto">
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => { setUploadType('transformation'); setStep(1); }}
                className="flex flex-col items-center justify-center p-8 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-500 hover:bg-slate-900 transition-all group gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ArrowRightLeft size={32} />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-white mb-1">AI Transformation</div>
                  <div className="text-[10px] text-slate-500 font-medium leading-tight">Before/After photos + Master Prompt</div>
                </div>
              </button>

              <button 
                onClick={() => { setUploadType('prompt-only'); setStep(1); }}
                className="flex flex-col items-center justify-center p-8 bg-slate-950 border border-slate-800 rounded-2xl hover:border-emerald-500 hover:bg-slate-900 transition-all group gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Sparkles size={32} />
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-white mb-1">Master Prompt</div>
                  <div className="text-[10px] text-slate-500 font-medium leading-tight">Share your precise AI generation prompt</div>
                </div>
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              {uploadType === 'prompt-only' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Prompt Title</label>
                  <input 
                    type="text"
                    value={promptTitle}
                    onChange={(e) => setPromptTitle(e.target.value)}
                    placeholder="e.g. Master Architectural Restoration"
                    className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 focus:border-indigo-600 outline-none transition-all text-xs font-medium text-slate-300"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Choose Category</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['human-restoration', 'building-decoration', 'other'] as const).map(c => (
                    <button 
                      key={c}
                      onClick={() => setCategory(c)}
                      className={cn(
                        "py-3 px-6 rounded-xl border font-bold text-xs transition-all",
                        category === c 
                          ? "border-indigo-600 bg-indigo-600/10 text-indigo-400" 
                          : "border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                      )}
                    >
                      {c.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex justify-between">
                  <span>{uploadType === 'transformation' ? "Master AI Prompt" : "The Master Prompt"}</span>
                  <span className={cn(prompt.length > 500 ? "text-rose-500" : "text-slate-600")}>{prompt.length}/500</span>
                </label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                  placeholder="Paste the precise prompt..."
                  className="w-full h-32 p-4 bg-slate-950 rounded-2xl border border-slate-800 focus:border-indigo-600 outline-none transition-all text-xs font-medium resize-none text-slate-300"
                />
              </div>

              {uploadType === 'prompt-only' && <AdMock size="rect" />}

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => { setStep(0); setUploadType(null); }}
                  className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold hover:bg-slate-700 transition-all text-xs"
                >
                  Back
                </button>
                <button 
                  onClick={() => {
                    if (uploadType === 'transformation') setStep(2);
                    else handleUpload();
                  }}
                  disabled={isUploading || !prompt || (uploadType === 'prompt-only' && !promptTitle)}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 text-xs"
                >
                  {uploadType === 'transformation' ? "Next Step" : (isUploading ? "Uploading..." : "Publish Prompt")}
                </button>
              </div>
            </div>
          )}

          {step === 2 && uploadType === 'transformation' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Before Photo</label>
                  <label className="relative flex flex-col items-center justify-center w-full aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950 hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden group">
                    {beforePreview ? (
                      <img src={beforePreview} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-600 group-hover:text-indigo-400">
                        <Camera size={32} className="mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Upload Original</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'before')} className="hidden" />
                  </label>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">After Photo</label>
                  <label className="relative flex flex-col items-center justify-center w-full aspect-[4/5] rounded-2xl border-2 border-dashed border-slate-800 bg-slate-950 hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden group">
                    {afterPreview ? (
                      <img src={afterPreview} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                    ) : (
                      <div className="flex flex-col items-center text-slate-600 group-hover:text-indigo-400">
                        <Sparkles size={32} className="mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Upload Result</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'after')} className="hidden" />
                  </label>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold hover:bg-slate-700 transition-all text-xs"
                >
                  Back
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={isUploading || !beforePreview || !afterPreview}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 text-xs"
                >
                  {isUploading ? "Publishing..." : "Publish Transformation"}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// --- Component: Profile Modal ---
function ProfileModal({ isOpen, onClose, profile, onSave }: { isOpen: boolean, onClose: () => void, profile: UserProfile | null, onSave: (p: UserProfile) => void }) {
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [isVendor, setIsVendor] = useState(profile?.isVendor || false);
  const [location, setLocation] = useState(profile?.vendorProfile?.location || '');
  const [contact, setContact] = useState(profile?.vendorProfile?.contact || '');
  const [services, setServices] = useState(profile?.vendorProfile?.services?.join(', ') || '');
  const [description, setDescription] = useState(profile?.vendorProfile?.description || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setIsVendor(profile.isVendor || false);
      setLocation(profile.vendorProfile?.location || '');
      setContact(profile.vendorProfile?.contact || '');
      setServices(profile.vendorProfile?.services?.join(', ') || '');
      setDescription(profile.vendorProfile?.description || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updatedProfile: UserProfile = {
        ...profile,
        displayName,
        isVendor,
        vendorProfile: isVendor ? {
          location,
          contact,
          description,
          services: services.split(',').map(s => s.trim()).filter(s => s)
        } : undefined
      };
      await updateDoc(doc(db, 'users', profile.uid), updatedProfile as any);
      onSave(updatedProfile);
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'users');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl border border-slate-800 max-h-[92vh] flex flex-col"
      >
        <div className="p-5 sm:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-black tracking-tighter">Profile Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5 sm:p-8 overflow-y-auto space-y-6">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 focus:border-indigo-600 outline-none text-xs font-medium text-slate-300 transition-all"
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
            <input 
              type="checkbox" 
              id="vendorCheck"
              checked={isVendor}
              onChange={(e) => setIsVendor(e.target.checked)}
              className="w-5 h-5 accent-indigo-600"
            />
            <label htmlFor="vendorCheck" className="text-xs font-bold text-indigo-400 flex items-center gap-2">
              <User size={14} /> I want to offer my services as an Artist/Vendor
            </label>
          </div>

          {isVendor && (
            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-4 border-t border-slate-800"
              >
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Services (comma separated)</label>
                  <input 
                    type="text" 
                    value={services}
                    onChange={(e) => setServices(e.target.value)}
                    placeholder="Photo Restoration, Interior AI, Character Design..."
                    className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 focus:border-indigo-600 outline-none text-xs font-medium text-slate-300 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Location</label>
                    <input 
                      type="text" 
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="City, Country"
                      className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 focus:border-indigo-600 outline-none text-xs font-medium text-slate-300 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Contact Info</label>
                    <input 
                      type="text" 
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="WhatsApp / Email"
                      className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 focus:border-indigo-600 outline-none text-xs font-medium text-slate-300 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell clients about your expertise..."
                    className="w-full h-32 p-4 bg-slate-950 rounded-xl border border-slate-800 focus:border-indigo-600 outline-none text-xs font-medium shadow-inner resize-none text-slate-300 transition-all"
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          <div className="pt-4 flex gap-4">
             <button 
              onClick={() => signOut(auth)}
              className="px-6 py-4 bg-red-500/10 text-red-500 rounded-2xl font-bold hover:bg-red-500/20 transition-all flex items-center gap-2 text-xs"
            >
              <LogOut size={16} /> Sign Out
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-4 bg-white text-slate-950 rounded-2xl font-bold hover:bg-slate-200 transition-all shadow-xl disabled:opacity-50 text-xs"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
