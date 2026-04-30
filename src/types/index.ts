export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  isVendor?: boolean;
  likedPhotos?: string[];
  vendorProfile?: {
    services: string[];
    location: string;
    contact: string;
    description: string;
  };
}

export type PhotoCategory = 'human-restoration' | 'building-decoration' | 'other';

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
