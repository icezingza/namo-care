import { useLocalStorage } from './useLocalStorage';
import { userProfile as mockProfile } from '../data/mockData';

const DEFAULT_PROFILE = {
  name: mockProfile.name,
  nameEn: mockProfile.nameEn,
  age: mockProfile.age,
  avatar: mockProfile.avatar,
  lineId: mockProfile.lineId,
};

/**
 * Hook for reading and updating the user's profile.
 * Persists to localStorage under 'namo_profile'.
 * Falls back to mockData defaults on first use.
 */
export function useUserProfile() {
  const [profile, setProfile] = useLocalStorage('namo_profile', DEFAULT_PROFILE);

  const updateProfile = (fields) => {
    setProfile((prev) => ({ ...prev, ...fields }));
  };

  return [profile, updateProfile];
}
