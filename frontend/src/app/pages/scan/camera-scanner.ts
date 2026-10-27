import { signal } from '@angular/core';

/** The state of the camera: why there is no picture, or that there is one. */
export type CameraState =
  | 'idle'
  | 'starting'
  | 'live'
  | 'denied'
  | 'missing'
  | 'insecure'
  | 'failed';

/** Reads codes from a frame; resolves with the text of the first code, or null. */
type Decoder = (frame: HTMLCanvasElement) => Promise<string | null>;

/** The camera the user chose last, the same key as the old frontend. */
const DEVICE_KEY = 'homebox:lastUsedDeviceId';
/** Frames per second the decoder looks at: enough to feel instant, light on the battery. */
const SCAN_FPS = 8;

/** The native detector where the browser has one (Chrome on Android, Safari 17+ on macOS). */
interface NativeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
interface NativeDetectorClass {
  new (options?: { formats: string[] }): NativeDetector;
  getSupportedFormats(): Promise<string[]>;
}

/**
 * The camera of the scanner: asks for the permission, shows the picture in a `<video>`,
 * switches between the cameras, switches the torch, and reads QR codes and barcodes from
 * the picture. The native `BarcodeDetector` reads where the browser has one, else ZXing,
 * loaded only then.
 */
export class CameraScanner {
  readonly state = signal<CameraState>('idle');
  readonly cameras = signal<MediaDeviceInfo[]>([]);
  readonly torchable = signal(false);
  readonly torch = signal(false);
  /** False while a hit is shown: the picture stays, the reading stops. */
  readonly reading = signal(true);

  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private decoder: Decoder | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly canvas = document.createElement('canvas');
  private stopped = false;

  constructor(private readonly onCode: (text: string) => void) {}

  /** Starts the camera into the video, the camera of last time or else the back camera. */
  async start(video: HTMLVideoElement, deviceId = readDevice()): Promise<void> {
    this.video = video;
    this.stopped = false;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.state.set('insecure');
      return;
    }
    this.state.set('starting');
    this.release();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
      });
    } catch (e) {
      const name = (e as DOMException)?.name;
      // A remembered camera that is gone: try once more with the default.
      if (deviceId && (name === 'OverconstrainedError' || name === 'NotFoundError')) {
        writeDevice(null);
        return this.start(video, null);
      }
      this.state.set(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'denied'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'missing'
            : 'failed',
      );
      return;
    }
    if (this.stopped) {
      this.release();
      return;
    }
    video.srcObject = this.stream;
    video.muted = true;
    video.setAttribute('playsinline', '');
    try {
      await video.play();
    } catch {
      // Autoplay of a muted inline video is allowed; a failure here leaves a still frame.
    }
    const track = this.stream.getVideoTracks()[0];
    const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
    this.torchable.set(!!caps.torch);
    this.torch.set(false);
    const id = track?.getSettings().deviceId;
    if (id) writeDevice(id);
    // The labels of the cameras are only there once the permission is granted.
    navigator.mediaDevices
      .enumerateDevices()
      .then((all) => this.cameras.set(all.filter((d) => d.kind === 'videoinput')))
      .catch(() => this.cameras.set([]));
    this.state.set('live');
    this.decoder ??= await createDecoder();
    this.loop();
  }

  /** The next camera in the list. */
  async switchCamera(): Promise<void> {
    const list = this.cameras();
    if (!this.video || list.length < 2) return;
    const current = this.stream?.getVideoTracks()[0]?.getSettings().deviceId;
    const at = list.findIndex((d) => d.deviceId === current);
    await this.start(this.video, list[(at + 1) % list.length].deviceId);
  }

  async toggleTorch(): Promise<void> {
    const track = this.stream?.getVideoTracks()[0];
    if (!track) return;
    const on = !this.torch();
    try {
      await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
      this.torch.set(on);
    } catch {
      this.torchable.set(false);
    }
  }

  /** Stops the camera; the light of the camera goes out. */
  stop(): void {
    this.stopped = true;
    this.release();
    if (this.state() === 'live' || this.state() === 'starting') this.state.set('idle');
  }

  private release(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
    this.torch.set(false);
  }

  private loop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(async () => {
      const video = this.video;
      if (!video || !this.stream || this.stopped) return;
      if (this.reading() && this.decoder && video.readyState >= 2 && video.videoWidth) {
        // A frame of at most 960px on its long side: enough for a label, quick to read.
        const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
        this.canvas.width = Math.round(video.videoWidth * scale);
        this.canvas.height = Math.round(video.videoHeight * scale);
        this.canvas.getContext('2d', { willReadFrequently: true })?.drawImage(
          video,
          0,
          0,
          this.canvas.width,
          this.canvas.height,
        );
        const text = await this.decoder(this.canvas).catch(() => null);
        if (text && this.reading() && !this.stopped) this.onCode(text);
      }
      this.loop();
    }, 1000 / SCAN_FPS);
  }
}

/** Reads the codes of a picture file (a photo of a label), the same way as the camera. */
export async function decodeImage(file: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  return (await createDecoder())(canvas);
}

const FORMATS = [
  'qr_code',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'data_matrix',
];

async function createDecoder(): Promise<Decoder> {
  const Native = (window as unknown as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (Native) {
    try {
      const supported = await Native.getSupportedFormats();
      if (supported.includes('qr_code')) {
        const detector = new Native({ formats: FORMATS.filter((f) => supported.includes(f)) });
        return async (frame) => (await detector.detect(frame))[0]?.rawValue ?? null;
      }
    } catch {
      // Fall through to ZXing.
    }
  }
  const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ]);
  const hints = new Map<unknown, unknown>([
    [
      DecodeHintType.POSSIBLE_FORMATS,
      [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.DATA_MATRIX,
      ],
    ],
  ]);
  const reader = new BrowserMultiFormatReader(hints as Map<never, unknown>);
  return async (frame) => {
    try {
      return reader.decodeFromCanvas(frame).getText();
    } catch {
      // ZXing throws when the frame holds no code.
      return null;
    }
  };
}

function readDevice(): string | null {
  try {
    return localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
}

function writeDevice(id: string | null): void {
  try {
    if (id) localStorage.setItem(DEVICE_KEY, id);
    else localStorage.removeItem(DEVICE_KEY);
  } catch {
    // Without storage the back camera is chosen again next time.
  }
}
