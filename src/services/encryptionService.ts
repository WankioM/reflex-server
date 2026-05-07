import { encrypt, decrypt } from '../config/encryption';
import { User } from '../models/User';
import { Errors } from '../errors/errorCodes';

// Store an encrypted BYO Claude API key for a user
export async function storeByoKey(userId: string, apiKey: string): Promise<void> {
  const { encrypted, iv } = encrypt(apiKey);

  // Masked preview shown back to the user so they can recognise which
  // key they saved (e.g. "sk-ant-…xy7z"). Safe to expose: 7 + 4 chars
  // out of a 100+ char key leaks nothing actionable. Computed here so
  // /me responses don't have to decrypt on every request.
  const preview = `${apiKey.slice(0, 7)}…${apiKey.slice(-4)}`;

  await User.updateOne(
    { _id: userId },
    {
      'byoKey.encryptedKey': encrypted,
      'byoKey.iv': iv,
      'byoKey.enabled': true,
      'byoKey.preview': preview,
    }
  );
}

// Retrieve the decrypted BYO key for a user
export async function getByoKey(userId: string): Promise<string | null> {
  const user = await User.findById(userId).select('byoKey');
  if (!user) throw Errors.NOT_FOUND('User');

  if (!user.byoKey.encryptedKey || !user.byoKey.iv) return null;

  return decrypt(user.byoKey.encryptedKey, user.byoKey.iv);
}

// Remove a stored BYO key
export async function removeByoKey(userId: string): Promise<void> {
  await User.updateOne(
    { _id: userId },
    {
      'byoKey.encryptedKey': null,
      'byoKey.iv': null,
      'byoKey.enabled': false,
      'byoKey.preview': null,
    }
  );
}

// Toggle BYO key usage on/off (without deleting the key)
export async function toggleByoKey(userId: string, enabled: boolean): Promise<void> {
  const user = await User.findById(userId).select('byoKey.encryptedKey');
  if (!user) throw Errors.NOT_FOUND('User');

  if (enabled && !user.byoKey.encryptedKey) {
    throw Errors.BYO_KEY_INVALID();
  }

  await User.updateOne({ _id: userId }, { 'byoKey.enabled': enabled });
}
