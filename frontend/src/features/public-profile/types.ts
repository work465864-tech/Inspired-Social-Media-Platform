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
  isVerified: boolean;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
  videosCount: number;
  likesCount: number;
  videos: PublicProfileVideo[];
};
