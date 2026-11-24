export type PublicProfileVideo = {
  id: string;
  title: string;
  caption: string;
  durationMs: number | null;
  viewsCount: number;
  likesCount: number;
  createdAt: string;
  thumbnailUrl: string | null;
};

export type PublicCreatorProfileData = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string;
  websiteUrl: string | null;
  coverImageUrl: string | null;
  isVerified: boolean;
  isPrivate: boolean;
  isOwner: boolean;
  canViewPrivateProfile: boolean;
  joinedAt: string;
  followersCount: number;
  followingCount: number;
  videosCount: number;
  likesCount: number;
  viewsCount: number;
  videos: PublicProfileVideo[];
  likedVideos: PublicProfileVideo[];
  page: number;
  hasMoreVideos: boolean;
  hasMoreLikedVideos: boolean;
};
