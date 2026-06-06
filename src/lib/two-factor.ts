import { authenticator } from "otplib"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import QRCode from "qrcode"

authenticator.options = { window: 1 }

export function generateTOTPSecret(): string {
  return authenticator.generateSecret(20)
}

export async function generateQRCodeDataURL(email: string, secret: string): Promise<string> {
  const otpauth = authenticator.keyuri(email, "LLMAtlas", secret)
  return QRCode.toDataURL(otpauth, { width: 200, margin: 2 })
}

export function verifyTOTP(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret })
  } catch {
    return false
  }
}

export async function generateBackupCodes(count = 8): Promise<{ codes: string[]; hashedCodes: string[] }> {
  const codes = Array.from({ length: count }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  )
  const hashedCodes = await Promise.all(codes.map((code) => bcrypt.hash(code, 10)))
  return { codes, hashedCodes }
}

export async function verifyBackupCode(code: string, hashedCodes: string[]): Promise<number> {
  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(code.toUpperCase(), hashedCodes[i])
    if (match) return i
  }
  return -1
}
