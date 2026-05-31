import { useState, useEffect, useRef, ChangeEvent, Fragment, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, FormEvent } from 'react';
import { 
  Plus, 
  PlusCircle,
  Upload,
  Mail,
  Shield,
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
  Trash2,
  MoreVertical,
  Filter,
  Settings,
  Layout,
  MessageSquare,
  BarChart3,
  Users,
  CheckCircle,
  Ban,
  TrendingUp,
  Globe,
  BookOpen
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
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  getDocFromServer,
  arrayUnion
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { cn, handleFirestoreError, OperationType, copyToClipboard } from './lib/utils';
import { Photo, PhotoCategory, UserProfile, PromptLibraryItem, Category, Announcement, AdminSettings, PromptAnalytic } from './types/index';
import { motion, AnimatePresence, useSpring, useTransform } from 'motion/react';

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
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(10);
      setCanSkip(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      setCanSkip(true);
    }
  }, [isOpen, timeLeft]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-3 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full bg-slate-900 rounded-[32px] overflow-hidden border border-white/10 shadow-2xl flex flex-col relative"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors border border-white/5"
        >
          <X size={20} />
        </button>

        <div className="relative aspect-video bg-black flex items-center justify-center flex-shrink-0">
          <div className="flex flex-col items-center gap-4">
            <motion.div 
               animate={{ rotate: 360 }}
               transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               className="w-16 h-16 rounded-full border-4 border-t-indigo-500 border-white/10" 
            />
            <div className="text-center">
              <p className="text-white font-black text-xl tracking-tight">Watching Ad...</p>
              <p className="text-indigo-400 font-bold text-xs mt-1 uppercase tracking-widest">{timeLeft}s remaining</p>
            </div>
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
        </div>

        <div className="p-8 pb-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
             <div className="w-1 h-3 bg-indigo-500 rounded-full" />
             <h3 className="text-2xl font-black text-white tracking-tight uppercase italic">Fast-Track Unlock</h3>
          </div>
          <p className="text-slate-400 text-sm mb-10 font-medium leading-relaxed max-w-[80%] mx-auto">
            Support the community by watching this short ad to reveal the master prompt for free.
          </p>
          
          <AnimatePresence mode="wait">
            {!canSkip ? (
              <motion.div 
                key="timer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full bg-slate-800 rounded-2xl py-4 flex items-center justify-center gap-3 border border-slate-700 opacity-50"
              >
                <div className="w-4 h-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Unlocking soon... ({timeLeft}s)</span>
              </motion.div>
            ) : (
              <motion.button 
                key="action"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  boxShadow: [
                    "0 0 0 rgba(79, 70, 229, 0)",
                    "0 0 20px rgba(79, 70, 229, 0.4)",
                    "0 0 0 rgba(79, 70, 229, 0)"
                  ]
                }}
                transition={{
                  scale: { type: "spring", stiffness: 400, damping: 25 },
                  boxShadow: { repeat: Infinity, duration: 2 }
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onComplete();
                  onClose();
                }}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 group"
              >
                <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                Copy Prompt Free
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

// --- Component: Before After Slider ---
const BeforeAfterSlider = ({ before, after }: { before: string, after: string }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use a spring for smooth, premium-feeling movement
  const springPos = useSpring(50, {
    damping: 30,
    stiffness: 250,
    mass: 0.5
  });

  useEffect(() => {
    springPos.set(sliderPos);
  }, [sliderPos, springPos]);

  const springClipPath = useTransform(springPos, (v) => `inset(0 ${100 - (v as number)}% 0 0)`);
  const springLeft = useTransform(springPos, (v) => `${v}%`);

  const handleMove = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as ReactTouchEvent).touches[0].clientX : (e as ReactMouseEvent).clientX;
    const position = ((clientX - rect.left) / rect.width) * 100;
    
    setSliderPos(Math.max(0, Math.min(100, position)));
  };

  const handleLeave = () => {
    setSliderPos(50); // Reset to center when mouse leaves
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden cursor-ew-resize select-none bg-slate-900"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {/* After image (background) */}
      <img src={after || undefined} className="absolute inset-0 w-full h-full object-cover" alt="After" referrerPolicy="no-referrer" />
      
      {/* Before image (overlay with clip-path) */}
      <motion.div 
        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
        style={{ clipPath: springClipPath }}
      >
        <img 
          src={before || undefined} 
          className="absolute inset-0 w-full h-full object-cover" 
          alt="Before" 
          referrerPolicy="no-referrer" 
        />
        {/* White line border at the edge of clip */}
        <div className="absolute top-0 bottom-0 right-0 w-[2px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] h-full" />
      </motion.div>

      {/* Slider Handle */}
      <motion.div 
        className="absolute top-0 bottom-0 w-px bg-white/80 z-20 pointer-events-none"
        style={{ left: springLeft }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white shadow-xl flex items-center justify-center border border-slate-200 text-slate-900">
          <ArrowRightLeft size={12} />
        </div>
      </motion.div>

      {/* Static Labels */}
      <div className="absolute bottom-3 left-3 z-30 pointer-events-none">
         <span className="bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded text-[7px] font-black text-white border border-white/10 uppercase tracking-widest">Before</span>
      </div>
      <div className="absolute bottom-3 right-3 z-30 pointer-events-none">
         <span className="bg-indigo-600/40 backdrop-blur-md px-1.5 py-0.5 rounded text-[7px] font-black text-white border border-white/10 uppercase tracking-widest">After</span>
      </div>
    </div>
  );
};

// --- Component: Ad Card ---
const AdCard = () => (
  <div className="w-full h-full min-h-[300px] border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center p-8 bg-slate-950/50 group hover:border-indigo-500/50 transition-colors">
    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
      <span className="text-xl">📢</span>
    </div>
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sponsored</p>
    <h3 className="text-sm font-bold text-slate-300 text-center mb-4">Space for Advertisement</h3>
  </div>
);

// --- Component: Photo Card ---
const PhotoCard = ({ photo, onAction, isLiked, categories, canDelete, onTrackInterest }: { photo: Photo, onAction: (p: Photo, action: 'prompt' | 'like' | 'share' | 'delete') => void, isLiked: boolean, categories: Category[], canDelete?: boolean, onTrackInterest?: (cat: string, score: number) => void }) => {
  const categoryName = categories.find(c => c.slug === photo.category)?.name || photo.category.replace('-', ' ');
  const [showMenu, setShowMenu] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (onTrackInterest) {
      hoverTimerRef.current = setTimeout(() => {
        onTrackInterest(photo.category, 1);
      }, 1200);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };
  
  return (
    <div 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      className="bento-card group flex flex-col overflow-hidden relative"
    >
      <div className="relative overflow-hidden aspect-[4/5] bg-slate-950">
        <BeforeAfterSlider before={photo.beforePhotoUrl} after={photo.afterPhotoUrl} />
        
        {/* Dropdown Menu Toggle */}
        <div className="absolute top-4 right-4 z-30">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-slate-900 transition-all active:scale-95"
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMenu(false)}
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="absolute right-0 mt-2 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden"
              >
                <button 
                  onClick={() => { onAction(photo, 'share'); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all border-b border-slate-800/50"
                >
                  <Share2 size={14} className="text-slate-500" /> Share Creation
                </button>
                {canDelete && (
                  <button 
                    onClick={() => { onAction(photo, 'delete'); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </motion.div>
            </>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-5 flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold text-[8px] sm:text-[10px]">
            {photo.userName.charAt(0)}
          </div>
          <p className="text-[10px] sm:text-xs font-semibold text-slate-300 tracking-tight truncate">{photo.userName}</p>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => onAction(photo, 'like')}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 sm:gap-2 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all text-[8px] sm:text-[10px] font-bold border",
              isLiked 
                ? "bg-rose-600 text-white border-rose-500" 
                : "bg-slate-800 text-rose-400 border-slate-700 hover:border-rose-500 group/like"
            )}
          >
            <Heart size={12} className={cn("sm:w-[14px] sm:h-[14px] transition-all", (isLiked || photo.likesCount > 0) && "fill-current")} />
            <span className="tabular-nums">{photo.likesCount || 0}</span>
          </button>
          
          <button 
            onClick={() => onAction(photo, 'prompt')}
            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 rounded-lg sm:rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all text-[9px] sm:text-[11px] font-bold border border-indigo-500 shadow-lg shadow-indigo-500/10 group/btn whitespace-nowrap"
          >
            <Copy size={13} className="sm:w-[15px] sm:h-[15px] group-hover/btn:scale-110 transition-transform" /> 
            <span>Prompt</span>
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
  const [activeTab, setActiveTab] = useState<'gallery' | 'prompts' | 'admin' | 'ai-gallery'>('gallery');
  const [categoryFilter, setCategoryFilter] = useState<PhotoCategory | string>('all');
  const [aiCatFilter, setAiCatFilter] = useState<string>('all');
  const [aiSortBy, setAiSortBy] = useState<'newest' | 'popular'>('newest');
  const [copiedPhotoId, setCopiedPhotoId] = useState<string | null>(null);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [initialUploadType, setInitialUploadType] = useState<'transformation' | 'prompt-only' | 'single-image' | 'prompt-library' | null>(null);
  const [promptsSearchQuery, setPromptsSearchQuery] = useState('');
  const [aiGallerySearchQuery, setAiGallerySearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [prompts, setPrompts] = useState<PromptLibraryItem[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [analytics, setAnalytics] = useState<PromptAnalytic[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  const [viewInterests, setViewInterests] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('prompta_interests');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const trackInterest = (categorySlug: string, score: number = 1) => {
    if (!categorySlug) return;
    setViewInterests(prev => {
      const current = prev[categorySlug] || 0;
      const updated = { ...prev, [categorySlug]: current + score };
      localStorage.setItem('prompta_interests', JSON.stringify(updated));
      return updated;
    });
  };

  const clearInterests = () => {
    setViewInterests({});
    localStorage.removeItem('prompta_interests');
  };
  
  const isSystemAdmin = user?.email === 'ab.abrojeho76@gmail.com';
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'policy' | 'legal' | 'contact' | null>(null);
  const [activeGalleryPhoto, setActiveGalleryPhoto] = useState<Photo | null>(null);
  const [pendingAction, setPendingAction] = useState<{ photo?: Photo, type: string, data?: string } | null>(null);
  const [copiedPromptInfo, setCopiedPromptInfo] = useState<{
    promptText: string;
    customAiLink?: string;
  } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'info' } | null>(null);

  const showSuccessToast = (message: string) => {
    setToast({ message, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  // Scroll visibility for Header and Search bars
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 50) {
        setIsHeaderVisible(true);
      } else {
        const diff = Math.abs(currentScrollY - lastScrollY);
        if (diff > 5) {
          if (currentScrollY > lastScrollY) {
            setIsHeaderVisible(false);
          } else {
            setIsHeaderVisible(true);
          }
        }
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
    const photosQuery = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));
    
    const unsubPhotos = onSnapshot(photosQuery, (snapshot) => {
      setPhotos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Photo)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'photos'));

    // Prompts
    const promptsQuery = query(collection(db, 'prompts'), orderBy('createdAt', 'desc'));
    const unsubPrompts = onSnapshot(promptsQuery, (snapshot) => {
      setPrompts(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PromptLibraryItem)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'prompts'));

    // Admin Specific Collections
    let unsubSettings: () => void = () => {};
    let unsubAnnouncements: () => void = () => {};
    let unsubCategories: () => void = () => {};
    let unsubAnalytics: () => void = () => {};
    let unsubAllUsers: () => void = () => {};

    // Settings & Announcements apply to everyone (readonly for them)
    unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setAdminSettings(doc.data() as AdminSettings);
    });

    unsubAnnouncements = onSnapshot(query(collection(db, 'announcements'), where('isActive', '==', true), orderBy('createdAt', 'desc')), (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
    });

    unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category)));
    });

    if (isSystemAdmin) {
      unsubAnalytics = onSnapshot(collection(db, 'analytics'), (snap) => {
        setAnalytics(snap.docs.map(d => ({ id: d.id, ...d.data() } as PromptAnalytic)));
      });
      unsubAllUsers = onSnapshot(collection(db, 'users'), (snap) => {
        setAllUsers(snap.docs.map(d => d.data() as UserProfile));
      });
    }

    // Seed default categories if empty (Admin only or anyone once)
    const seedCategories = async () => {
      const snap = await getDocs(collection(db, 'categories'));
      if (snap.empty) {
        const defaults = [
          { name: 'Human Restoration', slug: 'human-restoration' },
          { name: 'Building Decoration', slug: 'building-decoration' },
          { name: 'Character Design', slug: 'character-design' },
          { name: 'Nature Scenes', slug: 'nature' },
          { name: 'Abstract Art', slug: 'abstract' }
        ];
        for (const cat of defaults) {
          await addDoc(collection(db, 'categories'), cat);
        }
      }
    };
    seedCategories();

    return () => {
      unsubPhotos();
      unsubPrompts();
      unsubSettings();
      unsubAnnouncements();
      unsubCategories();
      unsubAnalytics();
      unsubAllUsers();
    };
  }, []);

  // SEO Effect
  useEffect(() => {
    if (adminSettings) {
      document.title = adminSettings.seoTitle;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', adminSettings.seoDescription);
    }
  }, [adminSettings]);

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

  const handleDeletePrompt = async (promptId: string) => {
    if (!window.confirm("Are you sure you want to delete this prompt?")) return;
    try {
      await deleteDoc(doc(db, 'prompts', promptId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `prompts/${promptId}`);
    }
  };

  const handlePhotoAction = async (photo: Photo, type: 'prompt' | 'like' | 'share' | 'delete') => {
    if (type === 'delete') {
      if (!window.confirm("Are you sure you want to delete this creation?")) return;
      try {
        await deleteDoc(doc(db, 'photos', photo.id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `photos/${photo.id}`);
      }
      return;
    }
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

        trackInterest(photo.category, 5);

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
      trackInterest(photo.category, 2);
      const shareData = {
        title: 'Check out this AI Transformation on Prompta!',
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
      trackInterest(pendingAction.photo.category, 3);
      copyToClipboard(pendingAction.photo.masterPrompt);
      showSuccessToast("Master prompt copied successfully!");
      
      // Set copied prompt details with custom uploader link if available
      setCopiedPromptInfo({
        promptText: pendingAction.photo.masterPrompt,
        customAiLink: pendingAction.photo.aiLink
      });

      // Log analytic
      updateDoc(doc(db, 'analytics', pendingAction.photo.id), {
         promptId: pendingAction.photo.id,
         copyCount: increment(1),
         lastCopiedAt: serverTimestamp()
      }).catch(() => {
        // If doc doesn't exist, create it
        setDoc(doc(db, 'analytics', pendingAction.photo.id), {
           promptId: pendingAction.photo.id,
           copyCount: 1,
           lastCopiedAt: serverTimestamp()
        });
      });
    } else if (pendingAction.type === 'libraryPrompt' && pendingAction.data) {
       copyToClipboard(pendingAction.data);
       showSuccessToast("Library prompt copied successfully!");
       
       // See if we have an item in prompt library to get its custom AI link matching the copied text
       const matchedItem = prompts.find(p => p.prompt === pendingAction.data);
       setCopiedPromptInfo({
         promptText: pendingAction.data,
         customAiLink: matchedItem?.aiLink
       });
    }
    setPendingAction(null);
  };

  const filteredPhotos = photos.filter(p => {
    if (p.isAiGallery || !p.beforePhotoUrl) return false;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const catName = categories.find(c => c.slug === p.category)?.name || '';
    return (
      p.userName.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      catName.toLowerCase().includes(q) ||
      p.masterPrompt.toLowerCase().includes(q)
    );
  });

  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(promptsSearchQuery.toLowerCase()) ||
    p.prompt.toLowerCase().includes(promptsSearchQuery.toLowerCase())
  );

  // Computed values for personalized recommendations
  const hasInterests = Object.values(viewInterests).some(val => (val as number) > 0);
  
  const sortedInterestingCategories = Object.entries(viewInterests)
    .filter(([_, score]) => (score as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([catSlug]) => catSlug);

  const favoriteCatSlug = sortedInterestingCategories[0] || '';
  const favoriteCatName = categories.find(c => c.slug === favoriteCatSlug)?.name || favoriteCatSlug.replace('-', ' ');

  // Trending default (ranked by likes count or descending order)
  const popularPhotos = [...photos]
    .filter(p => !p.isAiGallery && p.beforePhotoUrl)
    .sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0))
    .slice(0, 5);

  const recommendedPhotos = hasInterests
    ? photos
        .filter(p => !p.isAiGallery && p.beforePhotoUrl && sortedInterestingCategories.includes(p.category))
        .sort((a, b) => {
          const scoreA = viewInterests[a.category] || 0;
          const scoreB = viewInterests[b.category] || 0;
          if (scoreB !== scoreA) {
            return scoreB - scoreA;
          }
          return (b.likesCount || 0) - (a.likesCount || 0); // fallback to trending inside interest group
        })
        .slice(0, 5)
    : popularPhotos;

  let recommendedPhotosCombined = [...recommendedPhotos];
  if (recommendedPhotosCombined.length < 5) {
    for (const pop of popularPhotos) {
      if (!recommendedPhotosCombined.some(r => r.id === pop.id)) {
        recommendedPhotosCombined.push(pop);
      }
      if (recommendedPhotosCombined.length >= 5) break;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className={cn(
        "sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 transition-transform duration-300",
        isHeaderVisible ? "translate-y-0" : "-translate-y-full"
      )}>
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('gallery')} 
            className="flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-98 transition-all text-left"
          >
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">
              Prompt<span className="text-indigo-400">a</span>
            </span>
          </button>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <div className="hidden md:flex items-center gap-2.5">
              <button 
                onClick={() => setActiveTab('gallery')}
                className={cn(
                  "px-4.5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95",
                  activeTab === 'gallery' 
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500/20" 
                    : "bg-slate-900 border-slate-800 text-slate-350 hover:text-white hover:bg-slate-850 hover:border-slate-700"
                )}
              >
                <ArrowRightLeft size={13} />
                ReImagine
              </button>
              <button 
                onClick={() => setActiveTab('prompts')}
                className={cn(
                  "px-4.5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95",
                  activeTab === 'prompts' 
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500/20" 
                    : "bg-slate-900 border-slate-800 text-slate-350 hover:text-white hover:bg-slate-850 hover:border-slate-700"
                )}
              >
                <Sparkles size={13} />
                Prompt Hub
              </button>
              <button 
                onClick={() => setActiveTab('ai-gallery')}
                className={cn(
                  "px-4.5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95",
                  activeTab === 'ai-gallery' 
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-500/20" 
                    : "bg-slate-900 border-slate-800 text-slate-350 hover:text-white hover:bg-slate-850 hover:border-slate-700"
                )}
              >
                <ImageIcon size={13} />
                AI Gallery
              </button>
              {(isSystemAdmin || isAdminVerified) && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95",
                    activeTab === 'admin' 
                      ? "bg-amber-500 border-amber-400 text-slate-950 shadow-lg shadow-amber-500/20" 
                      : "bg-slate-900 border-slate-800 text-amber-500 hover:text-amber-400 hover:bg-slate-850"
                  )}
                >
                  <Settings size={11} /> Admin
                </button>
              )}
              {!isAdminVerified && !isSystemAdmin && (
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="px-3.5 py-1.5 rounded-full text-[11px] font-bold text-slate-400 hover:text-amber-400 border border-transparent hover:border-slate-800 hover:bg-slate-900 transition-all flex items-center gap-1.5"
                >
                  <Settings size={11} /> Admin Access
                </button>
              )}
            </div>

            {/* Hamburger Button (Mobile) */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Menu size={20} />
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowProfileModal(true)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-800 p-0.5"
                >
                  <img src={user.photoURL || undefined} className="w-full h-full rounded-full grayscale hover:grayscale-0 transition-all shadow-indigo-500/10 shadow-lg" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleLogin}
                  className="bg-indigo-600 text-white px-4 sm:px-5 h-9 sm:h-10 rounded-full text-xs font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  Login
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[110] bg-slate-950 p-6 flex flex-col md:hidden"
          >
            <div className="flex items-center justify-between mb-12">
              <button 
                onClick={() => { setActiveTab('gallery'); setIsMenuOpen(false); }}
                className="flex items-center gap-3 cursor-pointer hover:opacity-90 active:scale-98 transition-all text-left"
              >
                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Sparkles size={18} className="text-white" />
                </div>
                <h1 className="text-xl font-black tracking-tighter text-white uppercase">PROMPT<span className="text-indigo-400">A</span></h1>
              </button>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col gap-4">
              <button 
                onClick={() => { setActiveTab('gallery'); setIsMenuOpen(false); }}
                className={cn(
                  "w-full p-5 rounded-2xl flex items-center gap-4 text-sm font-bold transition-all",
                  activeTab === 'gallery' ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
                )}
              >
                <ArrowRightLeft size={20} /> ReImagine
              </button>
              <button 
                onClick={() => { setActiveTab('prompts'); setIsMenuOpen(false); }}
                className={cn(
                  "w-full p-5 rounded-2xl flex items-center gap-4 text-sm font-bold transition-all",
                  activeTab === 'prompts' ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
                )}
              >
                <Sparkles size={20} /> Prompt Hub
              </button>
              <button 
                onClick={() => { setActiveTab('ai-gallery'); setIsMenuOpen(false); }}
                className={cn(
                  "w-full p-5 rounded-2xl flex items-center gap-4 text-sm font-bold transition-all",
                  activeTab === 'ai-gallery' ? "bg-indigo-600 text-white" : "bg-slate-900 text-slate-400 border border-slate-800"
                )}
              >
                <ImageIcon size={20} /> AI Gallery
              </button>
              {(isSystemAdmin || isAdminVerified) ? (
                <button 
                  onClick={() => { setActiveTab('admin'); setIsMenuOpen(false); }}
                  className={cn(
                    "w-full p-5 rounded-2xl flex items-center gap-4 text-sm font-bold transition-all",
                    activeTab === 'admin' ? "bg-amber-500 text-slate-950" : "bg-slate-900 text-slate-400 border border-slate-800"
                  )}
                >
                  <Settings size={20} /> Admin Panel
                </button>
              ) : (
                <button 
                  onClick={() => { setShowPasswordModal(true); setIsMenuOpen(false); }}
                  className="w-full p-5 rounded-2xl flex items-center gap-4 text-sm font-bold bg-slate-900 border border-slate-800 text-slate-400"
                >
                  <Settings size={20} /> Admin Access
                </button>
              )}
            </nav>

            <div className="mt-auto p-6 bg-slate-900/50 rounded-3xl border border-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                  <User size={20} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{user?.displayName || 'Guest Artist'}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">{user?.email || 'Login for full access'}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Mobile Sticky Tab Bar (Bottom Taskbar) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around items-center h-16 px-1">
          {/* ReImagine Option */}
          <button
            onClick={() => setActiveTab('gallery')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-all",
              activeTab === 'gallery' ? "text-indigo-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <ArrowRightLeft size={20} className={activeTab === 'gallery' ? "scale-110 text-indigo-400" : "text-slate-400"} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">ReImagine</span>
          </button>

          {/* Prompt Hub Option */}
          <button
            onClick={() => setActiveTab('prompts')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-all",
              activeTab === 'prompts' ? "text-indigo-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Sparkles size={20} className={activeTab === 'prompts' ? "scale-110 text-indigo-400" : "text-slate-400"} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">Prompt Hub</span>
          </button>

          {/* AI Gallery Option */}
          <button
            onClick={() => setActiveTab('ai-gallery')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-all",
              activeTab === 'ai-gallery' ? "text-indigo-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
            )}
          >
            <ImageIcon size={20} className={activeTab === 'ai-gallery' ? "scale-110 text-indigo-400" : "text-slate-400"} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">AI Gallery</span>
          </button>

          {/* User Profile Option */}
          <button
            onClick={() => user ? setShowProfileModal(true) : handleLogin()}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full transition-all",
              showProfileModal ? "text-indigo-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
            )}
          >
            {user ? (
              <div className={cn(
                "w-6 h-6 rounded-full overflow-hidden transition-all",
                showProfileModal ? "ring-2 ring-indigo-500" : "ring-1 ring-slate-700"
              )}>
                <img src={user.photoURL || undefined} className="w-full h-full object-cover" />
              </div>
            ) : (
              <User size={20} className={showProfileModal ? "scale-110 text-indigo-400" : "text-slate-400"} />
            )}
            <span className="text-[10px] font-bold mt-1 tracking-tight truncate max-w-[70px]">
              {user ? 'Profile' : 'Login'}
            </span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-12 pb-10 px-6 overflow-hidden">
        <div className="max-w-[1400px] mx-auto relative z-10 text-center">
          {announcements.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-indigo-600 rounded-2xl border border-indigo-400 shadow-xl shadow-indigo-500/20 max-w-2xl mx-auto flex items-center justify-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white animate-pulse">
                <MessageSquare size={16} />
              </div>
              <p className="text-xs font-bold text-white tracking-tight">{announcements[0].text}</p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-bold text-[10px] uppercase tracking-widest mb-6 border border-indigo-500/20"
          >
            <Sparkles size={12} /> AI Vision Portal
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white max-w-4xl mx-auto mb-2 leading-tight px-4"
          >
            <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-green-400 bg-clip-text text-transparent">AI restoration</span>,{" "}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">redesigns</span>,{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">prompts</span>, and{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">inspiring AI galleries</span>{" "}
            <span className="bg-gradient-to-r from-rose-400 via-fuchsia-500 to-amber-400 bg-clip-text text-transparent font-extrabold tracking-wide drop-shadow-[0_4px_8px_rgba(244,63,94,0.5)]">— all in one place.</span>
          </motion.h1>
        </div>

        {/* Decorative ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -z-0" />
      </section>

      {/* Main Content Area */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-28 md:pb-20">
        {/* Gallery View */}
        {activeTab === 'gallery' && (
          <div className="space-y-8">
            {/* Header & Search inline row for Reimagine View */}
            <div className={cn(
              "sticky z-40 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 bg-slate-950/95 rounded-2xl border border-slate-800/60 backdrop-blur-xl mb-6 shadow-xl transition-all duration-300",
              isHeaderVisible ? "top-[64px]" : "top-0"
            )}>
              <div className="flex-shrink-0">
                <h2 className="text-xl sm:text-2xl font-black tracking-tighter text-white">
                  AI Restoration & Redesign
                </h2>
              </div>

              {/* Search Bar with Search Button */}
              <div className="flex flex-1 max-w-lg w-full items-center gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    id="smartImageSearch"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search: Restore Old Photos to New"
                    className="w-full pl-11 pr-10 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-medium transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-all"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
                <button 
                  type="button" 
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Search size={13} />
                  <span>Search</span>
                </button>
              </div>
            </div>

            <div 
              className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-6 pb-10"
            >
              {filteredPhotos.map((photo, idx) => (
                <Fragment key={photo.id}>
                  <div className="w-full">
                    <PhotoCard 
                      photo={photo} 
                      onAction={handlePhotoAction} 
                      isLiked={profile?.likedPhotos?.includes(photo.id) || false} 
                      categories={categories}
                      canDelete={isSystemAdmin || photo.userId === user?.uid}
                      onTrackInterest={trackInterest}
                    />
                  </div>
                  {/* Inject Ad Card based on admin settings */}
                  {(idx + 1) % (adminSettings?.adFrequency || 4) === 0 && (
                    <div className="w-full">
                      <AdCard />
                    </div>
                  )}
                </Fragment>
              ))}
              {filteredPhotos.length === 0 && (
                <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                  <ImageIcon size={48} className="mb-4 opacity-50" />
                  <p className="text-xl font-bold text-slate-300">No creations found yet</p>
                  <p className="text-sm">Be the first to upload an AI transformation!</p>
                </div>
              )}
            </div>
            <AdMock size="banner" />
          </div>
        )}

        {/* AI Gallery - Curated Masterpieces Showcase */}
        {activeTab === 'ai-gallery' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header & Search inline row for AI Gallery */}
            <div className={cn(
              "sticky z-40 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 bg-slate-950/95 rounded-2xl border border-slate-800/60 backdrop-blur-xl mb-6 shadow-xl transition-all duration-300",
              isHeaderVisible ? "top-[64px]" : "top-0"
            )}>
              <div className="flex-shrink-0">
                <h2 className="text-xl sm:text-2xl font-black tracking-tighter text-white">
                  AI Art Showcase
                </h2>
              </div>

              {/* Search Bar with Search Button */}
              <div className="flex flex-1 max-w-lg w-full items-center gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={aiGallerySearchQuery}
                    onChange={(e) => setAiGallerySearchQuery(e.target.value)}
                    placeholder="Search masterpieces, artists, patterns..."
                    className="w-full pl-11 pr-10 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-medium transition-all"
                  />
                  {aiGallerySearchQuery && (
                    <button
                      onClick={() => setAiGallerySearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-all"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
                <button 
                  type="button" 
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Search size={13} />
                  <span>Search</span>
                </button>
              </div>
            </div>

            {/* AI Gallery Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {photos
                .filter(p => {
                  if (!p.isAiGallery) return false;

                  const q = aiGallerySearchQuery.toLowerCase().trim();
                  return !q || (
                    p.userName.toLowerCase().includes(q) ||
                    p.category.toLowerCase().includes(q) ||
                    (p.masterPrompt && p.masterPrompt.toLowerCase().includes(q))
                  );
                })
                .sort((a, b) => {
                  const aTime = a.createdAt?.seconds || 0;
                  const bTime = b.createdAt?.seconds || 0;
                  return bTime - aTime;
                })
                .map((photo) => {
                  const categoryName = categories.find(c => c.slug === photo.category)?.name || photo.category.replace('-', ' ');

                  return (
                    <motion.div
                      key={`ai-gal-${photo.id}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setActiveGalleryPhoto(photo)}
                      className="relative bg-slate-900/40 border border-slate-850 rounded-2xl overflow-hidden group hover:shadow-2xl hover:shadow-indigo-500/5 hover:border-slate-800 transition-all duration-300 cursor-pointer"
                    >
                      {/* Final output view */}
                      <div className="relative aspect-square overflow-hidden bg-slate-950">
                        <img
                          src={photo.afterPhotoUrl}
                          alt="AI Artwork"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </motion.div>
                  );
                })}

              {photos.filter(p => p.isAiGallery).length === 0 && (
                <div className="col-span-full py-24 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-2xl border border-dashed border-slate-850">
                  <ImageIcon size={40} className="mb-3 opacity-40 text-slate-400" />
                  <p className="text-base font-bold text-slate-300">No masterpieces found</p>
                  <p className="text-xs mt-1 text-slate-550">Upload your masterpiece using the upload button above!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prompts Library */}
        {activeTab === 'prompts' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header & Search inline row for Prompt Hub */}
            <div className={cn(
              "sticky z-40 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 bg-slate-950/95 rounded-2xl border border-slate-800/60 backdrop-blur-xl mb-6 shadow-xl transition-all duration-300",
              isHeaderVisible ? "top-[64px]" : "top-0"
            )}>
              <div className="flex-shrink-0">
                <h2 className="text-xl sm:text-2xl font-black tracking-tighter text-white">
                  Master Prompt Library
                </h2>
              </div>

              {/* Search Bar with Search Button */}
              <div className="flex flex-1 max-w-lg w-full items-center gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={promptsSearchQuery}
                    onChange={(e) => setPromptsSearchQuery(e.target.value)}
                    placeholder="Search prompts, topics..."
                    className="w-full pl-11 pr-10 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs sm:text-sm font-medium transition-all"
                  />
                  {promptsSearchQuery && (
                    <button
                      onClick={() => setPromptsSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-all"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
                <button 
                  type="button" 
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Search size={13} />
                  <span>Search</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredPrompts.map((p, idx) => (
                <Fragment key={p.id}>
                  <div className="bento-card p-5 group flex flex-col sm:flex-row items-center sm:items-stretch gap-5 hover:bg-slate-800/40 min-h-[180px]">
                    {p.imageUrl && (
                      <div className="w-full sm:w-32 h-48 sm:h-auto rounded-xl overflow-hidden flex-shrink-0 bg-slate-950 border border-slate-800/80 relative">
                        <img 
                          src={p.imageUrl} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                          alt={p.title} 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <div className="flex-1 flex flex-col justify-between w-full text-center sm:text-left py-1">
                      <div className="mb-4">
                        <h3 className="font-bold text-slate-200 text-base tracking-tight truncate leading-none">{p.title}</h3>
                      </div>
                      
                      <button 
                        onClick={() => { 
                          setPendingAction({ type: 'libraryPrompt', data: p.prompt }); 
                          setShowAdModal(true); 
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-slate-200 rounded-lg font-bold hover:bg-indigo-600 hover:text-white transition-all text-xs border border-slate-700 active:scale-95 group-hover:border-indigo-500"
                      >
                        <Copy size={13} /> <span>Copy Master Prompt</span>
                      </button>
                    </div>
                  </div>
                  {/* Google Adsense mock every 4 items - matches card size */}
                  {(idx + 1) % 4 === 0 && (
                    <div className="bento-card p-4 flex flex-col items-center justify-center gap-2 h-full min-h-[160px] bg-slate-900/60 transition-all hover:bg-slate-800/40 border-dashed group">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-all">
                        <Globe size={20} />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sponsored</p>
                        <h3 className="text-xs font-bold text-slate-300">Space for Advertisement</h3>
                      </div>
                      <div className="w-full h-1 bg-slate-800 mt-2 rounded overflow-hidden">
                        <div className="w-1/3 h-full bg-indigo-600/30"></div>
                      </div>
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'admin' && (isSystemAdmin || isAdminVerified) && (
          <AdminDashboard 
            settings={adminSettings}
            users={allUsers}
            analytics={analytics}
            categories={categories}
            announcements={announcements}
            photos={photos}
            prompts={prompts}
            onUpload={() => { setInitialUploadType(null); setShowUploadModal(true); }}
            onPromptPhoto={() => { setInitialUploadType('single-image'); setShowUploadModal(true); }}
          />
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
        categories={categories}
        initialType={initialUploadType}
      />

      <AdminPasswordModal 
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onVerify={(success) => {
          if (success) {
            setIsAdminVerified(true);
            setActiveTab('admin');
          }
        }}
      />

      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
        profile={profile}
        onSave={(p) => setProfile(p)}
      />

      <FooterLegalModal 
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
        showSuccessToast={showSuccessToast}
      />

      <AiGalleryDetailModal 
        photo={activeGalleryPhoto}
        onClose={() => setActiveGalleryPhoto(null)}
        showSuccessToast={showSuccessToast}
      />

      <CopiedPromptRedirectModal 
        info={copiedPromptInfo}
        onClose={() => setCopiedPromptInfo(null)}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-indigo-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 border border-indigo-400"
          >
            <CheckCircle size={18} />
            <span className="text-xs font-black uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16 items-start">
             <div className="md:col-span-4 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                    <Sparkles size={16} />
                  </div>
                  <span className="text-lg font-bold tracking-tight">Prompta</span>
                </div>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  The intersection of AI creativity and professional restoration. We connect visionaries with the world's best AI artists.
                </p>

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

             <div className="md:col-span-4 grid grid-cols-2 sm:grid-cols-3 gap-8">
                <div className="space-y-4">
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Navigation</div>
                   <ul className="space-y-2 text-xs font-bold text-slate-500">
                      <li><button onClick={() => setActiveTab('gallery')} className="hover:text-indigo-400 text-left transition-colors">ReImagine</button></li>
                      <li><button onClick={() => setActiveTab('prompts')} className="hover:text-indigo-400 text-left transition-colors">Prompt Hub</button></li>
                      <li><button onClick={() => setActiveTab('ai-gallery')} className="hover:text-indigo-400 text-left transition-colors">AI Gallery</button></li>
                   </ul>
                </div>
                <div className="space-y-4">
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support</div>
                   <ul className="space-y-2 text-xs font-bold text-slate-500">
                      <li><button onClick={() => setLegalModalType('contact')} className="hover:text-indigo-400 text-left transition-colors">Contact Support</button></li>
                      <li><a href="#" className="hover:text-indigo-400 text-left block transition-colors">Community</a></li>
                      <li><a href="#" className="hover:text-indigo-400 text-left block transition-colors">Security</a></li>
                   </ul>
                </div>
                <div className="space-y-4 col-span-2 sm:col-span-1">
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal & Policy</div>
                   <ul className="space-y-2 text-xs font-bold text-slate-500">
                      <li><button onClick={() => setLegalModalType('privacy')} className="hover:text-indigo-400 text-left transition-colors">Privacy Policy</button></li>
                      <li><button onClick={() => setLegalModalType('policy')} className="hover:text-indigo-400 text-left transition-colors">Terms & Policy</button></li>
                      <li><button onClick={() => setLegalModalType('legal')} className="hover:text-indigo-400 text-left transition-colors">Legal Disclaimer</button></li>
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
              © 2026 PROMPTA PLATFORM • BUILT FOR ARTISTS
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Component: Footer Legal Modal ---
interface FooterLegalModalProps {
  type: 'privacy' | 'policy' | 'legal' | 'contact' | null;
  onClose: () => void;
  showSuccessToast: (msg: string) => void;
}

function FooterLegalModal({ type, onClose, showSuccessToast }: FooterLegalModalProps) {
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  if (!type) return null;

  const handleContactSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      showSuccessToast("Thank you! Your message has been sent successfully.");
      setContactForm({ name: '', email: '', subject: '', message: '' });
      setSubmitting(false);
      onClose();
    }, 1200);
  };

  const getTitle = () => {
    switch (type) {
      case 'privacy': return 'Privacy Policy';
      case 'policy': return 'Terms & Policies';
      case 'legal': return 'Legal Disclaimer';
      case 'contact': return 'Contact Support';
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col overflow-hidden text-left"
      >
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all active:scale-95 z-10"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800/60 flex-shrink-0">
          <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400">
            {type === 'contact' ? <Mail size={20} /> : <Shield size={20} />}
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">{getTitle()}</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">PROMPTA COMPLIANCE & HELP</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-slate-400 text-sm font-medium leading-relaxed">
          {type === 'privacy' && (
            <div className="space-y-4">
              <p className="text-slate-300">Last updated: May 2026</p>
              <h3 className="text-white font-black uppercase text-xs tracking-wider">1. Information We Collect</h3>
              <p>We collect information that you directly provide to us, including profile information and content details when you sign up, publish prompts, or upload artwork. We also automatically collect interaction data, such as which restyled photos or prompting styles you express interest in, to customize your recommendation feed locally on your device.</p>
              
              <h3 className="text-white font-black uppercase text-xs tracking-wider">2. How We Safeguard Your Data</h3>
              <p>Your prompt history and design transformations are stored securely using Firebase Cloud services. We employ modern standard authentication systems and restrict unauthorized access to any private or session logs. Public designs in the galleries are shared solely at your discretion.</p>
              
              <h3 className="text-white font-black uppercase text-xs tracking-wider">3. Third-Party Integrations</h3>
              <p>Certain components, such as avatars generated via Dicebear and databases managed securely through Google Cloud infrastructure, adhere strictly to respectful data usage procedures. We never trade, pass, or sell your personal details to outside analytical bodies.</p>
            </div>
          )}

          {type === 'policy' && (
            <div className="space-y-4">
              <p className="text-slate-300">Last updated: May 2026</p>
              <h3 className="text-white font-black uppercase text-xs tracking-wider">1. Acceptable Use Policy</h3>
              <p>Users must submit or publish only clean, ethical AI-generated artwork and prompts. Explicit, harmful, or maliciously deceptive material is strictly non-tolerated on Prompta. Our specialized system administrators monitor community uploads and reserve the complete right to flag or remove non-compliant content.</p>

              <h3 className="text-white font-black uppercase text-xs tracking-wider">2. Intellectual Property & AI Models</h3>
              <p>The templates and generated assets shown in public feeds are governed by respective permissive open licenses (including Creative Commons and public MIT frameworks depend on the underlying stable-diffusion or generative architecture). Make sure to attribute secondary artists and authors when modifying external works.</p>

              <h3 className="text-white font-black uppercase text-xs tracking-wider">3. Platform Services</h3>
              <p>Prompta offers visual prototyping, prompt library curation, and interactive re-imagining tools. These features are provided "as-is" without direct operational guarantees. Continuous system maintenance might cause brief downtime which will be logged live under our status feed.</p>
            </div>
          )}

          {type === 'legal' && (
            <div className="space-y-4">
              <p className="text-slate-300 font-bold">Official Regulatory Notice</p>
              <p>All AI-generated results, prompts, and picture restorations displayed on the Prompta platform are created for artistic discovery and exploration purposes. The underlying technology features stochastic processes, and absolute exact duplicate reproduction of complex styles may vary across runs.</p>
              
              <h3 className="text-white font-black uppercase text-xs tracking-wider">Limitation of Liability</h3>
              <p>Under no circumstances shall Prompta or its contributors be held liable for any incidental, secondary, or indirect outcomes resulting from hosting user-generated art, prompt libraries, or public image transformations.</p>
              
              <h3 className="text-white font-black uppercase text-xs tracking-wider">Verification Standards</h3>
              <p>Prompta employs manual authentication keys for verified system administrators to maintain safety benchmarks. Admin accounts represent curated contributors responsible for checking community standard violations.</p>
            </div>
          )}

          {type === 'contact' && (
            <form onSubmit={handleContactSubmit} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Your Name</label>
                  <input 
                    required
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Your Email Address</label>
                  <input 
                    required
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="Enter your email"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Subject</label>
                <input 
                  required
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  placeholder="What is your comment or inquiry about?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Message Details</label>
                <textarea 
                  required
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  placeholder="Type your feedback, feature request, or support inquiry here..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] mt-6 shadow-xl shadow-indigo-600/10"
              >
                {submitting ? (
                  <span>Sending message...</span>
                ) : (
                  <>
                    <Mail size={14} />
                    <span>Submit Query</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// --- Component: AI Gallery Detail Modal ---
interface AiGalleryDetailModalProps {
  photo: Photo | null;
  onClose: () => void;
  showSuccessToast: (msg: string) => void;
}

function AiGalleryDetailModal({ photo, onClose, showSuccessToast }: AiGalleryDetailModalProps) {
  if (!photo) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(photo.afterPhotoUrl, { mode: 'cors' });
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `Prompta_${photo.id || 'Art'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      showSuccessToast("Masterpiece download started!");
    } catch (err) {
      const link = document.createElement('a');
      link.href = photo.afterPhotoUrl;
      link.target = "_blank";
      link.download = `Prompta_${photo.id || 'Art'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showSuccessToast("Opened download link in new tab!");
    }
  };

  const handleShare = async () => {
    const shareUrl = photo.afterPhotoUrl;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Prompta AI Art Showcase',
          text: `Check out this amazing AI masterpiece by ${photo.userName || 'Anonymous'} on Prompta!`,
          url: shareUrl
        });
      } else {
        const success = await copyToClipboard(shareUrl);
        if (success) {
          showSuccessToast("Masterpiece link copied!");
        }
      }
    } catch (err) {
      const success = await copyToClipboard(shareUrl);
      if (success) {
        showSuccessToast("Masterpiece link copied!");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] flex flex-col md:flex-row text-left"
      >
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all active:scale-95 z-10"
        >
          <X size={18} />
        </button>

        {/* Left Side: Photo Display */}
        <div className="flex-1 flex items-center justify-center bg-slate-950 p-6 md:p-10 relative overflow-hidden min-h-[300px] md:min-h-0">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none z-1" />
          <img 
            src={photo.afterPhotoUrl} 
            alt="AI Masterpiece" 
            className="max-w-full max-h-[45vh] md:max-h-[65vh] object-contain rounded-2xl shadow-2xl border border-slate-800/85 relative z-2"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Right Side: Options and Information */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-800 p-6 sm:p-8 flex flex-col justify-center bg-slate-900/45 flex-shrink-0">
          <div className="space-y-4">
            <div className="text-center md:text-left mb-4">
              <span className="px-2.5 py-1 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[9px] font-black uppercase tracking-wider">
                Options
              </span>
            </div>

            <button
              onClick={handleShare}
              className="w-full h-12 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] border border-slate-700"
            >
              <Share2 size={15} className="text-indigo-400" />
              <span>Share</span>
            </button>

            <button
              onClick={handleDownload}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/15"
            >
              <Download size={15} />
              <span>Download</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- Component: Copied Prompt Redirect Modal ---
interface CopiedPromptRedirectModalProps {
  info: {
    promptText: string;
    customAiLink?: string;
  } | null;
  onClose: () => void;
}

function CopiedPromptRedirectModal({ info, onClose }: CopiedPromptRedirectModalProps) {
  if (!info) return null;

  const defaultAiPortals = [
    { name: 'Gemini AI', url: 'https://gemini.google.com', desc: 'Google Generative AI' },
    { name: 'ChatGPT', url: 'https://chatgpt.com', desc: 'OpenAI Language Model' },
    { name: 'Claude AI', url: 'https://claude.ai', desc: 'Anthropic Assistant' }
  ];

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col text-left overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all active:scale-95 z-10"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-800/60">
          <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-400 animate-pulse animate-duration-1000">
            <CheckCircle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight text-white">Prompt Copied!</h2>
            <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">Ready to generate artwork</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-950/60 border border-slate-800/60 p-4 rounded-xl">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Copied Text Preview</div>
            <p className="text-xs text-slate-400 font-medium italic leading-relaxed line-clamp-3">
              "{info.promptText}"
            </p>
          </div>

          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            {info.customAiLink 
              ? "This prompt is linked directly to a specific AI tool by its creator. Click below to open and paste your copied prompt:" 
              : "Choose an AI platform below to go directly, paste your copied prompt, and generate spectacular results:"}
          </p>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {info.customAiLink ? (
              <a 
                href={info.customAiLink.startsWith('http') ? info.customAiLink : `https://${info.customAiLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Sparkles size={14} className="text-indigo-200" />
                  </div>
                  <div>
                    <span className="block text-white font-black">Open Destination AI Platform</span>
                    <span className="block text-[8px] text-indigo-205 font-medium lowercase truncate max-w-[200px] mt-0.5">
                      {info.customAiLink}
                    </span>
                  </div>
                </div>
                <ExternalLink size={14} className="text-white/90" />
              </a>
            ) : (
              defaultAiPortals.map((portal) => (
                <a 
                  key={portal.name}
                  href={portal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all hover:bg-slate-800/40 hover:scale-[1.01] active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-slate-900 rounded-lg group-hover:bg-indigo-600/10 transition-colors">
                      <Globe size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div>
                      <span className="block text-slate-200 group-hover:text-white transition-colors">{portal.name}</span>
                      <span className="block text-[8px] text-slate-500 font-bold">{portal.desc}</span>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
                </a>
              ))
            )}
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full h-11 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 mt-6"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
}

// --- Component: Admin Password Modal ---
function AdminPasswordModal({ isOpen, onClose, onVerify }: { isOpen: boolean, onClose: () => void, onVerify: (s: boolean) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === "qadirali.123") {
      onVerify(true);
      onClose();
      setPassword('');
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mb-4 border border-amber-500/20">
            <Settings size={32} />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">Restricted Access</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Please verify your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Admin Password</label>
            <input 
              autoFocus
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className={cn(
                "w-full bg-slate-950 border rounded-2xl px-5 py-4 text-white outline-none transition-all",
                error ? "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.1)]" : "border-slate-800 focus:border-amber-500"
              )}
            />
            <AnimatePresence>
              {error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-rose-500 text-[10px] font-bold mt-2 ml-1"
                >
                  Authentication failed. Please try again.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98]"
          >
            Authorize Access
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// --- Component: Admin Dashboard ---
function AdminDashboard({ 
  settings, 
  users, 
  analytics, 
  categories, 
  announcements,
  photos,
  prompts,
  onUpload,
  onPromptPhoto
}: { 
  settings: AdminSettings | null, 
  users: UserProfile[], 
  analytics: PromptAnalytic[], 
  categories: Category[], 
  announcements: Announcement[],
  photos: Photo[],
  prompts: PromptLibraryItem[],
  onUpload: () => void,
  onPromptPhoto: () => void
}) {
  const [activeSubTab, setActiveSubTab] = useState<'content' | 'users' | 'monetization' | 'seo'>('content');
  const [newCategory, setNewCategory] = useState({ name: '', slug: '' });
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [localSettings, setLocalSettings] = useState<AdminSettings>(settings || {
    adFrequency: 2,
    activeAiLink: 'https://gemini.google.com',
    seoTitle: 'Prompta - AI Vision Portal',
    seoDescription: 'The ultimate AI transformation platform'
  });

  const handleUpdateRole = async (uid: string, role: 'isVendor' | 'isVerified' | 'status', value: any) => {
    try {
      await updateDoc(doc(db, 'users', uid), { [role]: value });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.slug) return;
    try {
      await addDoc(collection(db, 'categories'), { ...newCategory });
      setNewCategory({ name: '', slug: '' });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'categories');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm("Delete this category? This won't delete photos in it, but they will lose their category tag.")) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `categories/${id}`);
    }
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement) return;
    try {
      await addDoc(collection(db, 'announcements'), {
        text: newAnnouncement,
        createdAt: serverTimestamp(),
        isActive: true
      });
      setNewAnnouncement('');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'announcements');
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'global'), localSettings);
      alert("Settings saved successfully!");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/global');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Settings className="text-amber-500" /> Control Center
          </h2>
          <p className="text-slate-500 text-sm font-medium">Platform orchestration & management</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onUpload}
            className="bg-slate-900 text-slate-200 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white px-4 sm:px-6 h-10 sm:h-12 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/5"
          >
            <Upload size={16} className="text-indigo-400" /> <span>Upload</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">
        {(['content', 'users', 'monetization', 'seo'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={cn(
              "px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
              activeSubTab === tab ? "bg-white text-slate-950 shadow-lg" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Detailed Management */}
        <div className="md:col-span-8 space-y-8">
          {activeSubTab === 'content' && (
            <div className="space-y-8">
              {/* Announcement Management */}
              <div className="bento-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><MessageSquare size={18} className="text-emerald-400" /> Board</h3>
                <div className="flex gap-3 mb-6">
                  <input 
                    type="text" value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)}
                    placeholder="Global Announcement Message..." className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs" 
                  />
                  <button onClick={handleAddAnnouncement} className="bg-emerald-600 px-6 py-2 rounded-xl text-xs font-bold hover:bg-emerald-500">Post</button>
                </div>
                <div className="space-y-2">
                  {announcements.map(a => (
                    <div key={a.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-300">{a.text}</p>
                      <button 
                        onClick={() => updateDoc(doc(db, 'announcements', a.id), { isActive: false })}
                        className="text-slate-500 hover:text-red-400 p-2"
                      >
                        <Ban size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prompt Analytics Card */}
              <div className="bento-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-blue-400" /> Analytics</h3>
                <div className="space-y-4">
                  {analytics.sort((a,b) => b.copyCount - a.copyCount).slice(0, 5).map(stat => (
                    <div key={stat.id} className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Prompt ID: {stat.promptId.slice(0, 8)}...</span>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-1 max-w-[200px]">
                           <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, stat.copyCount * 2)}%` }}></div>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="text-lg font-black text-white">{stat.copyCount}</div>
                         <div className="text-[8px] text-slate-500 font-bold uppercase">Copies</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'users' && (
            <div className="bento-card p-6 overflow-x-auto">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Users size={18} className="text-purple-400" /> User Matrix</h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">
                    <th className="pb-4 px-2">User</th>
                    <th className="pb-4 px-2 text-center">Role</th>
                    <th className="pb-4 px-2 text-center">Verify</th>
                    <th className="pb-4 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {users.map(u => (
                    <tr key={u.uid} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          <img src={u.photoURL || undefined} className="w-8 h-8 rounded-lg" />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-200">{u.displayName}</span>
                            <span className="text-[9px] text-slate-500">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <button 
                          onClick={() => handleUpdateRole(u.uid, 'isVendor', !u.isVendor)}
                          className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all", 
                            u.isVendor ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/50" : "bg-slate-800 text-slate-500 border-slate-700"
                          )}
                        >
                          {u.isVendor ? 'Vendor' : 'User'}
                        </button>
                      </td>
                      <td className="py-4 px-2 text-center">
                         <button 
                          disabled={!u.isVendor}
                          onClick={() => handleUpdateRole(u.uid, 'isVerified', !u.isVerified)}
                          className={cn("p-2 rounded-lg transition-all", 
                            u.isVerified ? "text-blue-400" : "text-slate-700 hover:text-slate-500"
                          )}
                        >
                          <CheckCircle size={18} />
                        </button>
                      </td>
                      <td className="py-4 px-2 text-center">
                         <select 
                           value={u.status || 'active'}
                           onChange={(e) => handleUpdateRole(u.uid, 'status', e.target.value)}
                           className={cn("bg-slate-900 border border-slate-800 text-[10px] font-bold rounded-lg px-2 py-1 outline-none",
                             u.status === 'banned' ? "text-rose-500" : u.status === 'suspended' ? "text-amber-500" : "text-emerald-500"
                           )}
                         >
                           <option value="active">Active</option>
                           <option value="suspended">Suspended</option>
                           <option value="banned">Banned</option>
                         </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === 'monetization' && (
            <div className="bento-card p-8 space-y-8">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-rose-400" /> Revenue Stream</h3>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Ad Frequency (Every N Items)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" min="1" max="10" step="1" 
                      value={localSettings.adFrequency}
                      onChange={e => setLocalSettings({...localSettings, adFrequency: parseInt(e.target.value)})}
                      className="flex-1 accent-indigo-600"
                    />
                    <span className="text-xl font-black text-white w-8">{localSettings.adFrequency}</span>
                  </div>
                </div>
                <div className="space-y-4">
                   <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Active AI Resource Link</label>
                   <input 
                     type="text" 
                     value={localSettings.activeAiLink}
                     onChange={e => setLocalSettings({...localSettings, activeAiLink: e.target.value})}
                     placeholder="https://..."
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs" 
                   />
                </div>
              </div>
              <button 
                onClick={handleSaveSettings}
                className="w-full py-4 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
              >
                Sync Configuration
              </button>
            </div>
          )}

          {activeSubTab === 'seo' && (
            <div className="bento-card p-8 space-y-8">
               <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><Globe size={18} className="text-slate-400" /> SEO Management</h3>
               <div className="space-y-6">
                 <div>
                   <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Meta Title</label>
                   <input 
                     type="text" 
                     value={localSettings.seoTitle}
                     onChange={e => setLocalSettings({...localSettings, seoTitle: e.target.value})}
                     className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold" 
                   />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Meta Description</label>
                    <textarea 
                      value={localSettings.seoDescription}
                      onChange={e => setLocalSettings({...localSettings, seoDescription: e.target.value})}
                      className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-medium resize-none" 
                    />
                 </div>
                 <button 
                  onClick={handleSaveSettings}
                  className="w-full py-4 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl"
                >
                  Update Global SEO
                </button>
               </div>
            </div>
          )}
        </div>

        {/* Right Column: Platform stats */}
        <div className="md:col-span-4 space-y-6">
          <div className="bento-card p-6 bg-indigo-600/10 border-indigo-500/20">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-6">Inventory Health</h4>
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <span className="text-xs font-bold text-slate-300">Total Users</span>
                   <span className="text-lg font-black text-white">{users.length}</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-xs font-bold text-slate-300">Vendors</span>
                   <span className="text-lg font-black text-white">{users.filter(u => u.isVendor).length}</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-xs font-bold text-slate-300">Live Gallery</span>
                   <span className="text-lg font-black text-white">{photos.length}</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-xs font-bold text-slate-300">Prompt Library</span>
                   <span className="text-lg font-black text-white">{prompts.length}</span>
                </div>
             </div>
          </div>

          <div className="bento-card p-6">
             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Security Actions</h4>
             <div className="space-y-2">
                <button className="w-full text-left p-3 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 flex items-center gap-3 group transition-all">
                   <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                     <Ban size={14} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white">Wipe Suspended Users</span>
                      <span className="text-[8px] text-slate-500">Caution: Irreversible action</span>
                   </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 flex items-center gap-3 group transition-all">
                   <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                     <Layout size={14} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-white">Reset Analytics</span>
                      <span className="text-[8px] text-slate-500">Restore tracking points</span>
                   </div>
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Component: Upload Modal ---
function UploadModal({ 
  isOpen, 
  onClose, 
  user,
  categories,
  initialType = null
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  user: FirebaseUser | null,
  categories: Category[],
  initialType?: 'transformation' | 'prompt-only' | 'single-image' | 'prompt-library' | null
}) {
  const [uploadType, setUploadType] = useState<'transformation' | 'prompt-only' | 'single-image' | 'prompt-library' | null>(initialType);
  const [step, setStep] = useState(initialType ? 1 : 0); 

  useEffect(() => {
    if (isOpen) {
      setUploadType(initialType);
      setStep(initialType ? 1 : 0);
    }
  }, [isOpen, initialType]);
  const [category, setCategory] = useState<string>('');

  useEffect(() => {
    if (categories.length > 0 && !category) {
      setCategory(categories[0].slug);
    }
  }, [categories, category]);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [beforePreview, setBeforePreview] = useState<string>('');
  const [afterPreview, setAfterPreview] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [promptTitle, setPromptTitle] = useState('');
  const [aiLink, setAiLink] = useState('');
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

    if (uploadType === 'transformation' || uploadType === 'single-image') {
      const isTransformation = uploadType === 'transformation';
      if ((isTransformation && !beforePreview) || !afterPreview || !prompt) return;
      
      setIsUploading(true);
      try {
        await addDoc(collection(db, 'photos'), {
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          category,
          beforePhotoUrl: isTransformation ? beforePreview : '',
          afterPhotoUrl: afterPreview,
          masterPrompt: prompt,
          createdAt: serverTimestamp(),
          likesCount: 0,
          isAiGallery: !isTransformation,
          aiLink: aiLink.trim() || ''
        });
        resetAndClose();
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'photos');
      } finally {
        setIsUploading(false);
      }
    } else if (uploadType === 'prompt-only' || uploadType === 'prompt-library') {
      if (!prompt || !promptTitle) return;
      setIsUploading(true);
      try {
        await addDoc(collection(db, 'prompts'), {
          userId: user.uid,
          userName: user.displayName || 'Anonymous',
          title: promptTitle,
          prompt: prompt,
          imageUrl: afterPreview || '', // Optional photo for prompt library
          category: category === 'human-restoration' ? 'Human' : category === 'building-decoration' ? 'Architecture' : 'Other',
          createdAt: serverTimestamp(),
          aiLink: aiLink.trim() || ''
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
    setAiLink('');
    setCategory(categories[0]?.slug || '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "w-full bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[95vh] transition-all duration-300",
          step === 0 ? "max-w-4xl" : "max-w-xl"
        )}
      >
        <div className="p-5 sm:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-black tracking-tighter">
            {step === 0 ? "Share Your Work" : 
             uploadType === 'transformation' ? "Transformation Details" : 
             uploadType === 'single-image' ? "Upload photo art" :
             uploadType === 'prompt-library' ? "Prompt Library Submission" :
             "Prompt Details"}
          </h2>
          <button onClick={resetAndClose} className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto">
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                onClick={() => { setUploadType('transformation'); setStep(1); }}
                className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-500 hover:bg-slate-900 transition-all group gap-4 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ArrowRightLeft size={28} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-2">Restoration Transformation</div>
                  <div className="text-xs text-slate-500 font-medium leading-tight">Combine Before + After Photos with AI Prompts</div>
                </div>
              </button>

              <button 
                onClick={() => { setUploadType('single-image'); setStep(1); }}
                className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 rounded-2xl hover:border-violet-500 hover:bg-slate-900 transition-all group gap-4 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-violet-600/10 flex items-center justify-center text-violet-400 group-hover:bg-violet-600 group-hover:text-white transition-all">
                  <PlusCircle size={28} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-2">AI Gallery Art</div>
                  <div className="text-xs text-slate-500 font-medium leading-tight">Upload Single AI Generated Art to Curated Gallery</div>
                </div>
              </button>

              <button 
                onClick={() => { setUploadType('prompt-library'); setStep(1); }}
                className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 rounded-2xl hover:border-emerald-500 hover:bg-slate-900 transition-all group gap-4 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <BookOpen size={28} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white mb-2">Prompt Library</div>
                  <div className="text-xs text-slate-500 font-medium leading-tight">Add Master Prompt (Optional Photo Companion)</div>
                </div>
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              {uploadType === 'transformation' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Before</label>
                    <div 
                      onClick={() => document.getElementById('beforeUpload')?.click()}
                      className="aspect-[4/5] bg-slate-950 border border-slate-800 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-all overflow-hidden"
                    >
                      {beforePreview ? (
                        <img src={beforePreview} className="w-full h-full object-cover" />
                      ) : (
                        <Plus className="text-slate-800" size={32} />
                      )}
                    </div>
                    <input id="beforeUpload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'before')} />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">After</label>
                    <div 
                      onClick={() => document.getElementById('afterUpload')?.click()}
                      className="aspect-[4/5] bg-slate-950 border border-slate-800 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-all overflow-hidden"
                    >
                      {afterPreview ? (
                        <img src={afterPreview} className="w-full h-full object-cover" />
                      ) : (
                        <Plus className="text-slate-800" size={32} />
                      )}
                    </div>
                    <input id="afterUpload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'after')} />
                  </div>
                </div>
              )}

              {uploadType === 'single-image' && (
                <div className="max-w-[280px] mx-auto space-y-3">
                  <label className="block text-center text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Upload Photo</label>
                  <div 
                    onClick={() => document.getElementById('afterUpload')?.click()}
                    className="aspect-[4/5] bg-slate-950 border border-slate-800 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:border-emerald-500/50 transition-all overflow-hidden"
                  >
                    {afterPreview ? (
                      <img src={afterPreview} className="w-full h-full object-cover" />
                    ) : (
                      <Plus className="text-slate-800" size={40} />
                    )}
                  </div>
                  <input id="afterUpload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'after')} />
                </div>
              )}

              {uploadType === 'prompt-only' && (
                <div className="bg-slate-950/50 border border-slate-800 border-dashed p-8 rounded-xl flex flex-col items-center justify-center gap-4">
                  <MessageSquare size={32} className="text-slate-700" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entering text-only mode</p>
                </div>
              )}

              {uploadType === 'prompt-library' && (
                <div className="space-y-4">
                   <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Optional Photo</label>
                   <div 
                      onClick={() => document.getElementById('optionalPhotoUpload')?.click()}
                      className="w-full h-32 bg-slate-950 border border-slate-800 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-all overflow-hidden"
                    >
                      {afterPreview ? (
                        <div className="relative w-full h-full">
                          <img src={afterPreview} className="w-full h-full object-cover" />
                          <button 
                            onClick={(e) => { e.stopPropagation(); setAfterPreview(''); }}
                            className="absolute top-2 right-2 p-1 bg-red-500 rounded-md text-white hover:bg-red-600 transition-all"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                           <Camera size={24} className="text-slate-800" />
                           <span className="text-[8px] font-bold uppercase text-slate-600">Click to add (Recommended)</span>
                        </div>
                      )}
                    </div>
                    <input id="optionalPhotoUpload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'after')} />
                </div>
              )}

              {(uploadType === 'prompt-only' || uploadType === 'prompt-library') && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Prompt Title</label>
                  <input 
                    type="text"
                    value={promptTitle}
                    onChange={(e) => setPromptTitle(e.target.value)}
                    placeholder="e.g. Architectural Restoration Master"
                    className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 focus:border-indigo-600 outline-none transition-all text-xs font-medium text-slate-300"
                  />
                </div>
              )}



              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 flex justify-between">
                  <span>{uploadType === 'single-image' ? "Art Title name" : (uploadType === 'transformation' ? "Master AI Prompt" : "The Master Prompt")}</span>
                  <span className={cn(prompt.length > 500 ? "text-rose-500" : "text-slate-600")}>{prompt.length}/500</span>
                </label>
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                  placeholder={uploadType === 'single-image' ? "Enter the Art Title name..." : "Paste the precise prompt..."}
                  className="w-full h-32 p-4 bg-slate-950 rounded-2xl border border-slate-800 focus:border-indigo-600 outline-none transition-all text-xs font-medium resize-none text-slate-300 mb-4"
                />
              </div>

              {uploadType !== 'single-image' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    AI Direct Link (Optional)
                  </label>
                  <input 
                    type="text"
                    value={aiLink}
                    onChange={(e) => setAiLink(e.target.value)}
                    placeholder="e.g. https://gemini.google.com or https://chatgpt.com"
                    className="w-full p-4 bg-slate-950 rounded-xl border border-slate-800 focus:border-indigo-600 outline-none transition-all text-xs font-medium text-slate-300"
                  />
                </div>
              )}

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
                  disabled={isUploading || !prompt || ((uploadType === 'prompt-only' || uploadType === 'prompt-library') && !promptTitle)}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 text-xs"
                >
                  {uploadType === 'transformation' ? "Next Step" : (isUploading ? "Uploading..." : (uploadType === 'single-image' ? "Publish Art" : "Publish Prompt"))}
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
