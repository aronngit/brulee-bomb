import { GoogleGenAI } from "@google/genai";
import "../types/index";

const CACHE_PREFIX = 'hikari_brulee_img_';

function getAIInstance() {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('API Key not found. Please configure your API key.');
  return new GoogleGenAI({ apiKey });
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let delay = 2000; // Increased base delay
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isQuotaError = 
        error?.status === 429 || 
        error?.error?.code === 429 || 
        error?.message?.includes('429') ||
        error?.message?.includes('RESOURCE_EXHAUSTED');

      if (isQuotaError && i < maxRetries - 1) {
        console.warn(`Quota exceeded (attempt ${i + 1}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

function getCached(key: string): string | null {
  try {
    return localStorage.getItem(CACHE_PREFIX + key);
  } catch {
    return null;
  }
}

function setCache(key: string, value: string) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, value);
  } catch (e) {
    console.warn('Failed to cache image:', e);
  }
}

export function resetQuotaFlag() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch {}
}

export async function generateProductImage(menuItem: string = 'Brulee Bomb') {
  const cacheKey = `product_${menuItem.toLowerCase().replace(/\s+/g, '_')}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = menuItem === 'Brulee Bomb' 
    ? 'Professional food photography of a Brulee Bomb: a perfectly golden-brown crispy fried ball, split open to reveal a rich, molten, gooey cheese filling with small chunks of smoked beef sausage. High-end culinary presentation, warm soft lighting, macro lens detail, appetizing texture, white background.'
    : menuItem === 'Hikari Sushi'
      ? 'Professional food photography of Hikari Sushi: a premium sushi roll filled with crispy golden chicken nuggets and fresh green cucumber slices, topped with a beautiful artistic drizzle of Japanese mayo. Perfectly seasoned sushi rice, elegant presentation, macro lens detail, clean minimalist background.'
      : 'Professional food photography of a combo platter: golden-brown crispy Brulee Bombs with molten cheese filling and premium Hikari Sushi rolls filled with chicken nuggets and cucumber. Elegant culinary presentation, warm soft lighting, macro lens detail, appetizing texture, white background.';

  const ai = getAIInstance();
  const result = await retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const dataUrl = `data:image/png;base64,${part.inlineData.data}`;
        setCache(cacheKey, dataUrl);
        return dataUrl;
      }
    }
    throw new Error('No image data returned');
  });
  return result;
}

export async function generateLogoImage() {
  const cacheKey = 'logo_brulee';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = 'High-fidelity professional logo for "BRULÉE BOMB". Icon: a realistic golden-brown crispy brulee bomb ball split open with melting, gooey cheese inside, surrounded by stylized orange and yellow flames. Text: "BRULÉE BOMB" at the top in a bold, modern curved font. Bottom: a clean red ribbon with "CHEESE & SAUSAGE FILLED" in white uppercase letters. Background: solid warm yellow. Sharp details, professional branding, minimalist vector style.';

  const ai = getAIInstance();
  const result = await retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const dataUrl = `data:image/png;base64,${part.inlineData.data}`;
        setCache(cacheKey, dataUrl);
        return dataUrl;
      }
    }
    throw new Error('No image data returned');
  });
  return result;
}

export async function generateAICampusLogo() {
  const cacheKey = 'logo_ai_campus';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = 'High-fidelity mascot logo for "Institut STTS AI Campus". Mascot: a cute futuristic robot bird with blue and white armor, yellow beak, and large expressive digital eyes. Wing features a glowing blue AI device. Typography: "Institut STTS" in clean white with blue outline, "AI Campus" in large yellow bold letters below it. Circular blue border, minimalist flat design, professional tech branding, white background.';

  const ai = getAIInstance();
  const result = await retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const dataUrl = `data:image/png;base64,${part.inlineData.data}`;
        setCache(cacheKey, dataUrl);
        return dataUrl;
      }
    }
    throw new Error('No image data returned');
  });
  return result;
}

export async function generateISTTSManagementLogo() {
  const cacheKey = 'logo_istts_mgmt';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = 'High-fidelity circular corporate logo for "Manajemen Bisnis Digital ISTTS". Navy blue and white color scheme. Icon: a white circular background with a clean navy blue silhouette of a woman with long hair working on a laptop, set against a minimalist navy blue city skyline with a tall tower. Gear icons on the left. Typography: "MANAJEMEN" in large bold navy blue, "BISNIS DIGITAL" in smaller letters, and "ISTTS" at the bottom. Flat vector style, white background.';

  const ai = getAIInstance();
  const result = await retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const dataUrl = `data:image/png;base64,${part.inlineData.data}`;
        setCache(cacheKey, dataUrl);
        return dataUrl;
      }
    }
    throw new Error('No image data returned');
  });
  return result;
}

export async function generateHikariLogo() {
  const cacheKey = 'logo_hikari';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = 'High-fidelity circular logo for "HIKARI SUSHI". Center icon: a realistic sushi roll containing a chicken nugget and cucumber slice, topped with a beautiful mayo drizzle. Typography: "HIKARI" at top, "SUSHI" at bottom in bold navy blue. Japanese characters at the top. Subtext: "CHICKEN NUGGET & MAYO" in a smaller font. Light cream background, professional culinary branding, minimalist vector style.';

  const ai = getAIInstance();
  const result = await retryWithBackoff(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const dataUrl = `data:image/png;base64,${part.inlineData.data}`;
        setCache(cacheKey, dataUrl);
        return dataUrl;
      }
    }
    throw new Error('No image data returned');
  });
  return result;
}


