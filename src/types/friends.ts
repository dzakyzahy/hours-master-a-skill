export interface UserProfileSearchResult {
  id: string;
  username: string;
  email?: string;
  total_hours: number;
  avatar_url?: string;
  title?: string;
  bio?: string;
  isFriend: boolean;
  isPending: boolean;
}

export interface OrderedFriendIds {
  user_id_1: string;
  user_id_2: string;
}
