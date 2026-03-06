export interface User {
  id: string;
  name: string;
  color: string;
  avatar?: string | null;
}

export interface Cat {
  id: string;
  name: string;
  household_id: string;
  emoji: string;
  notes?: string;
  bio?: string;
  created_by?: string;
  household_name?: string;
  cover_photo?: string;
  cover_photo_id?: string;
  viewer_is_member?: number | boolean;
  photos?: CatPhoto[];
}

export interface CatPhoto {
  id: string;
  filename: string;
  uploader_name: string;
  uploader_color?: string;
  created_at: string;
}

export interface Household {
  id: string;
  name: string;
  created_at: string;
  created_by?: string;
  cats?: Cat[];
  members?: User[];
}

export interface SitPhoto {
  id: string;
  filename: string;
  uploader_name: string;
  uploader_color?: string;
  created_at: string;
}

export interface WatchSlot {
  id: string;
  watch_request_id: string;
  date: string;
  slot: "morning" | "evening";
  watcher_id: string;
  watcher_name?: string;
  watcher_color?: string;
  watcher_avatar?: string | null;
}

export interface WatchRequest {
  id: string;
  household_id: string;
  requester_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
  watcher_id?: string;
  morning_watcher_id?: string;
  evening_watcher_id?: string;
  created_at: string;
  // Joined fields
  household_name?: string;
  requester_name?: string;
  requester_color?: string;
  requester_avatar?: string | null;
  watcher_name?: string;
  watcher_color?: string;
  morning_watcher_name?: string;
  morning_watcher_color?: string;
  morning_watcher_avatar?: string | null;
  evening_watcher_name?: string;
  evening_watcher_color?: string;
  evening_watcher_avatar?: string | null;
  cats?: Cat[];
  slots?: WatchSlot[];
}
