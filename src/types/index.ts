export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  isVendor?: boolean;
  isVerified?: boolean;
  status?: 'active' | 'suspended' | 'banned';
  likedPhotos?: string[];
  vendorProfile?: {
    services: string[];
    location: string;
    contact: string;
    description: string;
  };
}

export type PhotoCategory = 'human-restoration' | 'building-decoration' | 'other' | string;

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface Announcement {
  id: string;
  text: string;
  createdAt: any;
  isActive: boolean;
}

export interface AdminSettings {
  adFrequency: number;
  activeAiLink: string;
  seoTitle: string;
  seoDescription: string;
}

export interface PromptAnalytic {
  id: string;
  promptId: string;
  copyCount: number;
  lastCopiedAt: any;
}

export interface Photo {
  id: string;
  userId: string;
  userName: string;
  category: PhotoCategory;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  masterPrompt: string;
  createdAt: any; // Firestore Timestamp
  likesCount: number;
}

export interface PromptLibraryItem {
  id: string;
  title: string;
  prompt: string;
  category: string;
  createdAt: any;
}
