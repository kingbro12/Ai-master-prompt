import { useState, useEffect, useRef, ChangeEvent, Fragment, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, FormEvent } from 'react';
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
  Globe
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
    <button className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4">Learn More</button>
  </div>
);

// --- Component: Photo Card ---
const PhotoCard = ({ photo, onAction, isLiked, categories, canDelete }: { photo: Photo, onAction: (p: Photo, action: 'prompt' | 'like' | 'share' | 'delete') => void, isLiked: boolean, categories: Category[], canDelete?: boolean }) => {
  const categoryName = categories.find(c => c.slug === photo.category)?.name || photo.category.replace('-', ' ');
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <div className="bento-card group flex flex-col overflow-hidden relative">
      <div className="relative overflow-hidden aspect-[4/5] bg-slate-950">
        <BeforeAfterSlider before={photo.beforePhotoUrl} after={photo.afterPhotoUrl} />
        
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <span className="text-slate-400 text-[9px] font-bold backdrop-blur-md px-2 py-1 rounded-md bg-slate-950/40 uppercase tracking-widest border border-white/10">
            {categoryName}
          </span>
        </div>

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
  const [activeTab, setActiveTab] = useState<'gallery' | 'prompts' | 'admin'>('gallery');
  const [categoryFilter, setCategoryFilter] = useState<PhotoCategory | string>('all');
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [initialUploadType, setInitialUploadType] = useState<'transformation' | 'prompt-only' | 'single-image' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [prompts, setPrompts] = useState<PromptLibraryItem[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [analytics, setAnalytics] = useState<PromptAnalytic[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  
  const isSystemAdmin = user?.email === 'ab.abrojeho76@gmail.com';
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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
  }, [categoryFilter]);

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
      window.open(adminSettings?.activeAiLink || 'https://gemini.google.com/', '_blank');
    } else if (pendingAction.type === 'libraryPrompt' && pendingAction.data) {
       copyToClipboard(pendingAction.data);
       window.open(adminSettings?.activeAiLink || 'https://gemini.google.com/', '_blank');
    }
    setPendingAction(null);
  };

  const filteredPhotos = photos.filter(p => 
    p.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.masterPrompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.prompt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Vision<span className="text-indigo-400">Master</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <div className="hidden md:flex items-center gap-1">
              <button 
                onClick={() => setActiveTab('gallery')}
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] font-bold transition-all",
                  activeTab === 'gallery' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Community Gallery
              </button>
              <button 
                onClick={() => setActiveTab('prompts')}
                className={cn(
                  "px-4 py-2 rounded-full text-[10px] font-bold transition-all",
                  activeTab === 'prompts' ? "bg-indigo-600/10 text-indigo-400" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Prompt Library
              </button>
              {(isSystemAdmin || isAdminVerified) && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-bold transition-all flex items-center gap-2",
                    activeTab === 'admin' ? "bg-amber-500/10 text-amber-400" : "text-amber-500/60 hover:text-amber-400"
                  )}
                >
                  <Settings size={12} /> Admin
                </button>
              )}
              {!isAdminVerified && !isSystemAdmin && (
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="px-4 py-2 rounded-full text-[10px] font-bold text-slate-500 hover:text-amber-400 transition-all flex items-center gap-2"
                >
                  <Settings size={12} /> Admin Access
                </button>
              )}
            </div>

            <div className="relative group">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vision..."
                className="w-32 sm:w-40 h-9 pl-9 pr-4 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-medium text-slate-300 focus:w-48 focus:border-indigo-500 outline-none transition-all"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>

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
          
          <div className="flex flex-wrap gap-4 justify-center">
            <button 
              onClick={() => setActiveTab('gallery')}
              className={cn(
                "px-8 py-4 rounded-2xl font-bold text-sm transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-3",
                activeTab === 'gallery' ? "bg-indigo-600 text-white shadow-indigo-600/20" : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              )}
            >
              <ArrowRightLeft size={20} />
              Explore Community Gallery
            </button>
            <button 
              onClick={() => setActiveTab('prompts')}
              className={cn(
                "px-8 py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3",
                activeTab === 'prompts' ? "bg-indigo-600 text-white shadow-indigo-600/20" : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              )}
            >
              <Sparkles size={20} />
              Access Prompt Library
            </button>
          </div>
        </div>

        {/* Decorative ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] -z-0" />
      </section>

      {/* Main Content Area */}
      <main className="max-w-[1400px] mx-auto px-6 pb-20">
        {/* Gallery View */}
        {activeTab === 'gallery' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar w-full md:w-auto">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border",
                    categoryFilter === 'all' 
                      ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                      : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                  )}
                >
                  <Filter size={12} />
                  <span>All Items</span>
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.slug)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border",
                      categoryFilter === cat.slug 
                        ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                        : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300"
                    )}
                  >
                    <span className="capitalize">{cat.name}</span>
                  </button>
                ))}
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
        )}        {/* Prompts Library */}
        {activeTab === 'prompts' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bento-card p-12 mb-12 text-center bg-gradient-to-br from-slate-900 to-slate-950">
              <h2 className="text-3xl font-black mb-4 tracking-tighter">Master Prompt Library</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredPrompts.map((p, idx) => (
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
                   </ul>
                </div>
                <div className="space-y-4">
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resources</div>
                   <ul className="space-y-2 text-xs font-bold text-slate-500">
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
    seoTitle: 'VisionMaster - AI Vision Portal',
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
            onClick={onPromptPhoto}
            className="bg-emerald-600/10 text-emerald-400 border border-emerald-500/30 px-3 sm:px-6 h-10 sm:h-12 rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-600/20 transition-all shadow-lg active:scale-95"
          >
            <Sparkles size={18} /> <span>Prompt + Photo</span>
          </button>
          <button 
            onClick={onUpload}
            className="bg-indigo-600 text-white px-3 sm:px-8 h-10 sm:h-12 rounded-2xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg active:scale-95 shadow-indigo-600/20"
          >
            <Plus size={20} /> <span>+ Upload</span>
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
              {/* Category Management */}
              <div className="bento-card p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Layout size={18} className="text-indigo-400" /> Categories</h3>
                <div className="flex gap-3 mb-6">
                  <input 
                    type="text" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                    placeholder="Category Name" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs" 
                  />
                  <input 
                    type="text" value={newCategory.slug} onChange={e => setNewCategory({...newCategory, slug: e.target.value})}
                    placeholder="slug-name" className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs" 
                  />
                  <button onClick={handleAddCategory} className="bg-indigo-600 px-6 py-2 rounded-xl text-xs font-bold hover:bg-indigo-500">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <div key={c.id} className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-[10px] font-bold flex items-center gap-2">
                      <span className="text-slate-400">#</span> {c.name}
                    </div>
                  ))}
                </div>
              </div>

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
  initialType?: 'transformation' | 'prompt-only' | 'single-image' | null
}) {
  const [uploadType, setUploadType] = useState<'transformation' | 'prompt-only' | 'single-image' | null>(initialType);
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
    setCategory(categories[0]?.slug || '');
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
            {step === 0 ? "Share Your Work" : 
             uploadType === 'transformation' ? "Transformation Details" : 
             uploadType === 'single-image' ? "Photo + Prompt Details" :
             "Prompt Details"}
          </h2>
          <button onClick={resetAndClose} className="p-2 hover:bg-slate-800 rounded-full transition-all text-slate-400">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto">
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button 
                onClick={() => { setUploadType('transformation'); setStep(1); }}
                className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 rounded-2xl hover:border-indigo-500 hover:bg-slate-900 transition-all group gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ArrowRightLeft size={24} />
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-bold text-white mb-1">Restoration</div>
                  <div className="text-[8px] text-slate-500 font-medium leading-tight">Before + After</div>
                </div>
              </button>

              <button 
                onClick={() => { setUploadType('single-image'); setStep(1); }}
                className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 rounded-2xl hover:border-emerald-500 hover:bg-slate-900 transition-all group gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <Layout size={24} />
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-bold text-white mb-1">Photo + Prompt</div>
                  <div className="text-[8px] text-slate-500 font-medium leading-tight">Single Image</div>
                </div>
              </button>

              <button 
                onClick={() => { setUploadType('prompt-only'); setStep(1); }}
                className="flex flex-col items-center justify-center p-6 bg-slate-950 border border-slate-800 rounded-2xl hover:border-amber-500 hover:bg-slate-900 transition-all group gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-amber-600/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-all">
                  <Sparkles size={24} />
                </div>
                <div className="text-center">
                  <div className="text-[11px] font-bold text-white mb-1">Only Prompt</div>
                  <div className="text-[8px] text-slate-500 font-medium leading-tight">Text Logic</div>
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

              {uploadType === 'prompt-only' && (
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
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Choose Category</label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => setCategory(c.slug)}
                      className={cn(
                        "py-3 px-6 rounded-xl border font-bold text-xs transition-all",
                        category === c.slug 
                          ? "border-indigo-600 bg-indigo-600/10 text-indigo-400" 
                          : "border-slate-800 bg-slate-900 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                  {categories.length === 0 && (
                     <div className="col-span-2 p-4 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-slate-950 rounded-xl border border-dashed border-slate-800">
                        Loading categories...
                     </div>
                  )}
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
