import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../firebase'

export const uploadReceipt = (file, driveId, category, onProgress) => {
  return new Promise((resolve, reject) => {
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

export const deleteReceipt = (path) =>
  deleteObject(ref(storage, path)).catch(() => {})
