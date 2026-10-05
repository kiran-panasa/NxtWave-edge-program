import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../firebase'

export const uploadReceipt = (
  file: File,
  driveId: string,
  category: string,
  onProgress?: (pct: number) => void,
) => {
  return new Promise<{ url: string; path: string }>((resolve, reject) => {
    const ext  = file.name.split('.').pop()
    const path = `receipts/${driveId}/${category}_${Date.now()}.${ext}`
    const storageRef = ref(storage, path)
    const task = uploadBytesResumable(storageRef, file)

    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve({ url, path })
      }
    )
  })
}

export const deleteReceipt = (path: string) =>
  deleteObject(ref(storage, path)).catch(() => {})
