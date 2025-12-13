

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import AudioVisualizer, { VisualizerStyle } from './components/AudioVisualizer';
import { StopIcon, MicrophoneIcon, VolumeUpIcon, LightningBoltIcon, RecordIcon, CompressorIcon, DelayIcon, PanIcon, SoundWaveIcon, NoiseGateIcon, ReverbIcon, KaraokeIcon, FolderIcon, PlayIcon, AiIcon, SearchIcon } from './components/Icons';
import EqualizerControl from './components/EqualizerControl';
import { initDB, addRecording, getAllRecordings, deleteRecording, Recording } from './db';
import ToggleSwitch from './components/ToggleSwitch';
import PrivacyPolicy from './components/PrivacyPolicy';
import YouTubePlayerView, { YouTubePlayerViewRef } from './components/YouTubePlayer';
import RecordingHistory from './components/RecordingHistory';
import TermsAndConditions from './components/TermsAndConditions';

type Status = 'stopped' | 'running' | 'error';
type ControlTab = 'amplifier' | 'equalizer' | 'effects' | 'karaoke' | 'recordings';
type KaraokeRecordingStatus = 'idle' | 'recording';

// Add type definition for Google credential response
declare global {
  interface Window {
    google: any;
  }
}

interface UserInfo {
  email: string;
  name: string;
  picture: string;
}

const initialEqBands = [
  { id: 'sub', label: 'Sub Bass', gain: 0, freq: 60, type: 'lowshelf' as BiquadFilterType },
  { id: 'bass', label: 'Low Mid', gain: 0, q: 1, freq: 250, type: 'peaking' as BiquadFilterType },
  { id: 'mid', label: 'Mid', gain: 0, q: 1, freq: 1000, type: 'peaking' as BiquadFilterType },
  { id: 'upperMid', label: 'High Mid', gain: 0, q: 1, freq: 4000, type: 'peaking' as BiquadFilterType },
  { id: 'treble', label: 'Treble', gain: 0, freq: 10000, type: 'highshelf' as BiquadFilterType },
];

const presets: { [key: string]: typeof initialEqBands } = {
  flat: JSON.parse(JSON.stringify(initialEqBands)),
  bassBoost: [
    { id: 'sub', label: 'Sub Bass', gain: 6, freq: 60, type: 'lowshelf' as BiquadFilterType },
    { id: 'bass', label: 'Low Mid', gain: 4, q: 1, freq: 250, type: 'peaking' as BiquadFilterType },
    { id: 'mid', label: 'Mid', gain: 0, q: 1, freq: 1000, type: 'peaking' as BiquadFilterType },
    { id: 'upperMid', label: 'High Mid', gain: 0, q: 1, freq: 4000, type: 'peaking' as BiquadFilterType },
    { id: 'treble', label: 'Treble', gain: 0, freq: 10000, type: 'highshelf' as BiquadFilterType },
  ],
  vocalBoost: [
    { id: 'sub', label: 'Sub Bass', gain: -2, freq: 60, type: 'lowshelf' as BiquadFilterType },
    { id: 'bass', label: 'Low Mid', gain: -2, q: 1, freq: 250, type: 'peaking' as BiquadFilterType },
    { id: 'mid', label: 'Mid', gain: 3, q: 1.5, freq: 1500, type: 'peaking' as BiquadFilterType },
    { id: 'upperMid', label: 'High Mid', gain: 4, q: 1.2, freq: 4000, type: 'peaking' as BiquadFilterType },
    { id: 'treble', label: 'Treble', gain: 2, freq: 10000, type: 'highshelf' as BiquadFilterType },
  ],
  trebleBoost: [
    { id: 'sub', label: 'Sub Bass', gain: 0, freq: 60, type: 'lowshelf' as BiquadFilterType },
    { id: 'bass', label: 'Low Mid', gain: 0, q: 1, freq: 250, type: 'peaking' as BiquadFilterType },
    { id: 'mid', label: 'Mid', gain: 0, q: 1, freq: 1000, type: 'peaking' as BiquadFilterType },
    { id: 'upperMid', label: 'High Mid', gain: 2, q: 1.5, freq: 4000, type: 'peaking' as BiquadFilterType },
    { id: 'treble', label: 'Treble', gain: 5, freq: 10000, type: 'highshelf' as BiquadFilterType },
  ],
};

const EffectSlider = ({ label, value, min, max, step, onChange, unit = '', format = (v: number) => v.toFixed(2), onReset }: any) => (
    <div className="flex flex-col items-center space-y-2 text-white w-full">
        <div className="flex items-center gap-3">
            <label className="text-lg font-medium">{label}</label>
            {onReset && (
                <button onClick={onReset} className="text-xs bg-gray-600 hover:bg-gray-500 rounded px-2 py-1 transition-colors">Reset</button>
            )}
        </div>
        <div className="flex items-center space-x-4 w-full">
            <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-cyan-400" />
        </div>
        <span className="text-base font-mono p-1 bg-gray-800 rounded-md w-24 text-center">{format(value)}{unit}</span>
    </div>
);


const App: React.FC = () => {
    const [status, setStatus] = useState<Status>('stopped');
    const [gain, setGain] = useState<number>(1);
    const [drive, setDrive] = useState<number>(0);
    const [visualizerStyle, setVisualizerStyle] = useState<VisualizerStyle>('onepunch');
    const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedInput, setSelectedInput] = useState<string>('default');
    const [selectedOutput, setSelectedOutput] = useState<string>('default');
    const [hasOutputSelection, setHasOutputSelection] = useState(false);
    const [activeTab, setActiveTab] = useState<ControlTab>('amplifier');
    const [latency, setLatency] = useState<number>(0.01);
    
    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [dbLoaded, setDbLoaded] = useState(false);

    // EQ state
    const [eqBands, setEqBands] = useState<typeof initialEqBands>(JSON.parse(JSON.stringify(initialEqBands)));
    const [currentPreset, setCurrentPreset] = useState('flat');
    const [postGain, setPostGain] = useState(1);

    // Effects state
    const [compressorEnabled, setCompressorEnabled] = useState(false);
    const [compressor, setCompressor] = useState({ threshold: -24, knee: 30, ratio: 12, attack: 0.003, release: 0.25 });
    const [delayEnabled, setDelayEnabled] = useState(false);
    const [delay, setDelay] = useState({ time: 0.5, feedback: 0.5 });
    const [panner, setPanner] = useState({ pan: 0 });
    const [noiseGateEnabled, setNoiseGateEnabled] = useState(false);
    const [noiseGate, setNoiseGate] = useState({ threshold: -50, release: 0.25 });
    const [reverbEnabled, setReverbEnabled] = useState(false);
    const [reverb, setReverb] = useState({ mix: 0.5 });
    
    // Legal modals state
    const [isPrivacyPolicyOpen, setIsPrivacyPolicyOpen] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);

    // Karaoke state
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [isAutoSignInEnabled, setIsAutoSignInEnabled] = useState(true);
    const [youtubeSearchQuery, setYoutubeSearchQuery] = useState('');
    const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
    const [youtubeSearchResults, setYoutubeSearchResults] = useState<{title: string, videoId: string, thumbnailUrl: string}[]>([]);
    const [isYoutubeSearchLoading, setIsYoutubeSearchLoading] = useState(false);
    const [youtubeVideoId, setYoutubeVideoId] = useState('');
    const [youtubeVideoTitle, setYoutubeVideoTitle] = useState('');
    const [backingTrackVolume, setBackingTrackVolume] = useState(50);
    const [youtubePlaybackRate, setYoutubePlaybackRate] = useState(1);
    const [karaokeRecordingStatus, setKaraokeRecordingStatus] = useState<KaraokeRecordingStatus>('idle');
    const [youtubeVideoCurrentTime, setYoutubeVideoCurrentTime] = useState(0);
    const [youtubeVideoDuration, setYoutubeVideoDuration] = useState(0);
    const [aiHelpMessage, setAiHelpMessage] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [youtubeSearchHistory, setYoutubeSearchHistory] = useState<string[]>([]);
    const [isSearchHistoryVisible, setIsSearchHistoryVisible] = useState(false);
    const youtubePlayerRef = useRef<YouTubePlayerViewRef>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const driveNodeRef = useRef<WaveShaperNode | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    const eqNodesRef = useRef<BiquadFilterNode[]>([]);
    const postGainNodeRef = useRef<GainNode | null>(null);
    const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
    const delayNodeRef = useRef<DelayNode | null>(null);
    const feedbackNodeRef = useRef<GainNode | null>(null);
    const pannerNodeRef = useRef<StereoPannerNode | null>(null);
    const noiseGateNodeRef = useRef<GainNode | null>(null);
    const noiseGateAnalyserNodeRef = useRef<AnalyserNode | null>(null);
    const scriptProcessorNodeRef = useRef<ScriptProcessorNode | null>(null);
    const reverbNodeRef = useRef<ConvolverNode | null>(null);
    const reverbWetGainRef = useRef<GainNode | null>(null);
    const reverbDryGainRef = useRef<GainNode | null>(null);
    const noiseGateRef = useRef(noiseGate);
    
    const aiRef = useRef<GoogleGenAI | null>(null);

    const loadRecordings = useCallback(async () => {
        const recs = await getAllRecordings();
        setRecordings(recs);
    }, []);

    useEffect(() => {
        noiseGateRef.current = noiseGate;
    }, [noiseGate]);

    useEffect(() => {
        initDB().then(success => {
            if (success) {
                setDbLoaded(true);
                loadRecordings();
            }
        });
        aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        try {
            const storedHistory = localStorage.getItem('youtubeSearchHistory');
            if (storedHistory) {
                setYoutubeSearchHistory(JSON.parse(storedHistory));
            }
        } catch (error) {
            console.error("Failed to parse search history from localStorage", error);
            setYoutubeSearchHistory([]);
        }
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
            setUserInfo(JSON.parse(storedUserInfo));
        }
        const storedAutoSignIn = localStorage.getItem('isAutoSignInEnabled');
        if (storedAutoSignIn !== null) {
            setIsAutoSignInEnabled(JSON.parse(storedAutoSignIn));
        }
    }, [loadRecordings]);
    
    // Google Sign-In initialization
    useEffect(() => {
      const handleCredentialResponse = (response: any) => {
        // Decode the JWT to get user info
        const decoded: any = JSON.parse(atob(response.credential.split('.')[1]));
        const newUserInfo = {
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
        };
        setUserInfo(newUserInfo);
        localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
      };
  
      const initializeGsi = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: '37136612568-0tajt1jtlrb93cib16dangmsgr8cn4is.apps.googleusercontent.com',
            callback: handleCredentialResponse,
          });
          
          if (!userInfo) {
              window.google.accounts.id.renderButton(
                document.getElementById('google-signin-button'),
                { theme: 'outline', size: 'large', type: 'standard', text: 'signin_with' }
              );
              if (isAutoSignInEnabled) {
                window.google.accounts.id.prompt(); // Display the One Tap prompt
              }
          }
        }
      };
      
      // The Google script is loaded asynchronously. We need to wait for it.
      // FIX: Cast result of querySelector to HTMLScriptElement to access 'onload' property.
      const script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
      if (script) {
          script.onload = () => initializeGsi();
      } else if (window.google) { // If script is already loaded
          initializeGsi();
      }
      
    }, [userInfo, isAutoSignInEnabled]);

    useEffect(() => {
        localStorage.setItem('youtubeSearchHistory', JSON.stringify(youtubeSearchHistory));
    }, [youtubeSearchHistory]);

    useEffect(() => {
        localStorage.setItem('isAutoSignInEnabled', JSON.stringify(isAutoSignInEnabled));
    }, [isAutoSignInEnabled]);


    const enumerateDevices = useCallback(async () => {
        try {
            if (!navigator.mediaDevices?.enumerateDevices) {
                console.warn("enumerateDevices() not supported.");
                return;
            }
            const devices = await navigator.mediaDevices.enumerateDevices();
            const inputs = devices.filter(d => d.kind === 'audioinput');
            const outputs = devices.filter(d => d.kind === 'audiooutput');
            setInputDevices(inputs);
            setOutputDevices(outputs);
            
            // @ts-ignore
            setHasOutputSelection('setSinkId' in (window.AudioContext || window.webkitAudioContext).prototype);

            if (!inputs.find(d => d.deviceId === selectedInput)) {
                setSelectedInput('default');
            }
            if (!outputs.find(d => d.deviceId === selectedOutput)) {
                setSelectedOutput('default');
            }

        } catch (err) {
            console.error("Error enumerating devices:", err);
        }
    }, [selectedInput, selectedOutput]);

    useEffect(() => {
        enumerateDevices();
        navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
        };
    }, [enumerateDevices]);

    const connectNodes = useCallback(async () => {
        if (!audioContextRef.current || !sourceNodeRef.current) return;
        
        const bufferSize = audioContextRef.current.sampleRate * latency;

        let lastNode: AudioNode = sourceNodeRef.current;
    
        if (noiseGateEnabled) {
            noiseGateAnalyserNodeRef.current = audioContextRef.current.createAnalyser();
            noiseGateAnalyserNodeRef.current.fftSize = 256;
            
            scriptProcessorNodeRef.current = audioContextRef.current.createScriptProcessor(256, 1, 1);
            noiseGateNodeRef.current = audioContextRef.current.createGain();

            const data = new Uint8Array(noiseGateAnalyserNodeRef.current.frequencyBinCount);
            
            scriptProcessorNodeRef.current.onaudioprocess = () => {
                if (!noiseGateNodeRef.current || !noiseGateAnalyserNodeRef.current || !audioContextRef.current) return;
                
                const { threshold, release } = noiseGateRef.current;
                const thresholdValue = Math.pow(10, threshold / 20);

                noiseGateAnalyserNodeRef.current.getByteTimeDomainData(data);
                const rms = Math.sqrt(data.reduce((acc, val) => acc + Math.pow((val - 128) / 128, 2), 0) / data.length);
                
                if (rms > thresholdValue) {
                    noiseGateNodeRef.current.gain.setTargetAtTime(1, audioContextRef.current.currentTime, 0.01);
                } else {
                    noiseGateNodeRef.current.gain.setTargetAtTime(0, audioContextRef.current.currentTime, release);
                }
            };
            
            lastNode.connect(noiseGateAnalyserNodeRef.current);
            noiseGateAnalyserNodeRef.current.connect(scriptProcessorNodeRef.current);
            scriptProcessorNodeRef.current.connect(audioContextRef.current.destination); // This is a common way to keep the node alive

            lastNode.connect(noiseGateNodeRef.current);
            lastNode = noiseGateNodeRef.current;
        }

        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.value = gain;
        lastNode.connect(gainNodeRef.current);
        lastNode = gainNodeRef.current;

        driveNodeRef.current = audioContextRef.current.createWaveShaper();
        const curve = new Float32Array(256);
        const k = drive * 50;
        const deg = Math.PI / 180;
        for (let i = 0; i < 256; i++) {
            let x = (i * 2) / 256 - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        driveNodeRef.current.curve = curve;
        driveNodeRef.current.oversample = '4x';
        lastNode.connect(driveNodeRef.current);
        lastNode = driveNodeRef.current;

        if(compressorEnabled){
            compressorNodeRef.current = audioContextRef.current.createDynamicsCompressor();
            compressorNodeRef.current.threshold.value = compressor.threshold;
            compressorNodeRef.current.knee.value = compressor.knee;
            compressorNodeRef.current.ratio.value = compressor.ratio;
            compressorNodeRef.current.attack.value = compressor.attack;
            compressorNodeRef.current.release.value = compressor.release;
            lastNode.connect(compressorNodeRef.current);
            lastNode = compressorNodeRef.current;
        }
        
        eqNodesRef.current = eqBands.map(band => {
            const filter = audioContextRef.current!.createBiquadFilter();
            filter.type = band.type;
            filter.frequency.value = band.freq;
            filter.gain.value = band.gain;
            if (band.q) filter.Q.value = band.q;
            return filter;
        });

        eqNodesRef.current.forEach(filter => {
            lastNode.connect(filter);
            lastNode = filter;
        });
        
        postGainNodeRef.current = audioContextRef.current.createGain();
        postGainNodeRef.current.gain.value = postGain;
        lastNode.connect(postGainNodeRef.current);
        lastNode = postGainNodeRef.current;

        if (delayEnabled) {
            delayNodeRef.current = audioContextRef.current.createDelay(5.0);
            feedbackNodeRef.current = audioContextRef.current.createGain();
            delayNodeRef.current.delayTime.value = delay.time;
            feedbackNodeRef.current.gain.value = delay.feedback;
            
            lastNode.connect(delayNodeRef.current);
            delayNodeRef.current.connect(feedbackNodeRef.current);
            feedbackNodeRef.current.connect(delayNodeRef.current);
            lastNode = delayNodeRef.current;
        }
        
        pannerNodeRef.current = audioContextRef.current.createStereoPanner();
        pannerNodeRef.current.pan.value = panner.pan;
        lastNode.connect(pannerNodeRef.current);
        lastNode = pannerNodeRef.current;

        const mainSignalPath = lastNode;
        const finalMixer = audioContextRef.current.createGain();

        if (reverbEnabled) {
            reverbDryGainRef.current = audioContextRef.current.createGain();
            reverbWetGainRef.current = audioContextRef.current.createGain();
            reverbNodeRef.current = audioContextRef.current.createConvolver();
            
            // Create a simple impulse response
            const sampleRate = audioContextRef.current.sampleRate;
            const length = sampleRate * 2;
            const impulse = audioContextRef.current.createBuffer(2, length, sampleRate);
            const left = impulse.getChannelData(0);
            const right = impulse.getChannelData(1);
            for (let i = 0; i < length; i++) {
                left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
                right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
            }
            reverbNodeRef.current.buffer = impulse;

            mainSignalPath.connect(reverbDryGainRef.current);
            reverbDryGainRef.current.connect(finalMixer);

            mainSignalPath.connect(reverbNodeRef.current);
            reverbNodeRef.current.connect(reverbWetGainRef.current);
            reverbWetGainRef.current.connect(finalMixer);

            const mix = reverb.mix;
            reverbDryGainRef.current.gain.value = 1 - mix;
            reverbWetGainRef.current.gain.value = mix;

            lastNode = finalMixer;
        } else {
             mainSignalPath.connect(finalMixer);
             lastNode = finalMixer;
        }

        analyserNodeRef.current = audioContextRef.current.createAnalyser();
        analyserNodeRef.current.fftSize = 256;
        lastNode.connect(analyserNodeRef.current);
        
        lastNode.connect(audioContextRef.current.destination);

    }, [gain, drive, eqBands, postGain, compressor, compressorEnabled, delay, delayEnabled, panner, noiseGate, noiseGateEnabled, reverb, reverbEnabled, latency]);

    const start = async () => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContext({
                latencyHint: 'interactive',
                sampleRate: 44100,
            });
            
            // Adjust the context's latency
            if (audioContextRef.current.baseLatency !== undefined) {
                 // We can't directly set it, but we can be aware of it
                 console.log(`Base audio context latency: ${audioContextRef.current.baseLatency * 1000} ms`);
            }


            if (hasOutputSelection && selectedOutput !== 'default') {
                // @ts-ignore
                await audioContextRef.current.setSinkId(selectedOutput);
            }
            
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: selectedInput ? { exact: selectedInput } : undefined, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
            });
            mediaStreamRef.current = stream;
            sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
            
            await connectNodes();

            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                recordedChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = async () => {
                if (recordedChunksRef.current.length > 0) {
                    const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm;codecs=opus' });
                    await addRecording(blob);
                    recordedChunksRef.current = [];
                    await loadRecordings();
                }
            };

            setStatus('running');
            if (navigator.mediaSession) {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: 'One-Punch Amp',
                    artist: 'Live Audio Feed',
                    album: 'Sound Amplifier',
                });
                navigator.mediaSession.playbackState = 'playing';
            }
        } catch (error) {
            console.error('Error starting audio processing:', error);
            setStatus('error');
        }
    };

    const stop = () => {
        if (isRecording) {
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        sourceNodeRef.current = null;
        gainNodeRef.current = null;
        driveNodeRef.current = null;
        analyserNodeRef.current = null;
        
        // Disconnect script processor to prevent memory leaks
        scriptProcessorNodeRef.current?.disconnect();
        scriptProcessorNodeRef.current = null;

        setStatus('stopped');
        if (navigator.mediaSession) {
            navigator.mediaSession.playbackState = 'paused';
        }
    };
    
    const restartAudio = async () => {
        if (status === 'running') {
            stop();
            await new Promise(resolve => setTimeout(resolve, 50)); // Give a moment for resources to release
            await start();
        }
    };
    
    useEffect(() => {
        if (status === 'running' && gainNodeRef.current) gainNodeRef.current.gain.value = gain;
    }, [gain, status]);

    useEffect(() => {
        if (status === 'running' && driveNodeRef.current) {
            const curve = new Float32Array(256);
            const k = drive * 50;
            const deg = Math.PI / 180;
            for (let i = 0; i < 256; i++) {
                let x = (i * 2) / 256 - 1;
                curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
            }
            driveNodeRef.current.curve = curve;
        }
    }, [drive, status]);
    
    useEffect(() => {
        eqNodesRef.current.forEach((node, index) => {
            if (node) {
                node.gain.value = eqBands[index].gain;
                node.frequency.value = eqBands[index].freq;
                if(eqBands[index].q) node.Q.value = eqBands[index].q!;
            }
        });
    }, [eqBands]);

    useEffect(() => {
        if (postGainNodeRef.current) postGainNodeRef.current.gain.value = postGain;
    }, [postGain]);

    useEffect(() => { restartAudio(); }, [selectedInput, selectedOutput, latency]);
    useEffect(() => { if (status === 'running') { restartAudio(); } }, [compressorEnabled, delayEnabled, noiseGateEnabled, reverbEnabled]);
    
    // Effects parameter updates
    useEffect(() => { 
        if (compressorNodeRef.current) {
            compressorNodeRef.current.threshold.value = compressor.threshold;
            compressorNodeRef.current.knee.value = compressor.knee;
            compressorNodeRef.current.ratio.value = compressor.ratio;
            compressorNodeRef.current.attack.value = compressor.attack;
            compressorNodeRef.current.release.value = compressor.release;
        }
    }, [compressor]);
    useEffect(() => { if (delayNodeRef.current) delayNodeRef.current.delayTime.value = delay.time; }, [delay.time]);
    useEffect(() => { if (feedbackNodeRef.current) feedbackNodeRef.current.gain.value = delay.feedback; }, [delay.feedback]);
    useEffect(() => { if (pannerNodeRef.current) pannerNodeRef.current.pan.value = panner.pan; }, [panner]);
    useEffect(() => {
        if(reverbDryGainRef.current && reverbWetGainRef.current) {
            reverbDryGainRef.current.gain.value = 1 - reverb.mix;
            reverbWetGainRef.current.gain.value = reverb.mix;
        }
    }, [reverb.mix]);

    useEffect(() => {
        if (navigator.mediaSession) {
            navigator.mediaSession.setActionHandler('play', () => { if(status !== 'running') handleStartStop(); });
            navigator.mediaSession.setActionHandler('pause', () => { if(status === 'running') handleStartStop(); });
            navigator.mediaSession.setActionHandler('stop', () => { if(status === 'running') handleStartStop(); });
        }
    }, [status]);
    
    useEffect(() => {
        if (status === 'running' && youtubeVideoId && navigator.mediaSession) {
            try {
                // FIX: Cast MediaSession to 'any' to set the non-standard 'playbackRate' property and resolve TypeScript error.
                (navigator.mediaSession as any).playbackRate = youtubePlaybackRate;
            } catch (e) {
                console.warn("Setting playbackRate on mediaSession is not supported by this browser.");
            }
        }
    }, [youtubePlaybackRate, status, youtubeVideoId]);


    const handleStartStop = () => {
        if (status === 'running') {
            stop();
        } else {
            start();
        }
    };

    const handleRecord = () => {
        if (status === 'running') {
            if (isRecording) {
                mediaRecorderRef.current?.stop();
            } else {
                recordedChunksRef.current = [];
                mediaRecorderRef.current?.start();
            }
            setIsRecording(!isRecording);
        }
    };
    
    const handleDeleteRecording = async (id: number) => {
        await deleteRecording(id);
        await loadRecordings();
    };
    
    const handleEqBandChange = (index: number, property: 'gain' | 'q' | 'freq', value: number) => {
        setEqBands(prev => {
            const newBands = [...prev];
            // @ts-ignore
            newBands[index][property] = value;
            return newBands;
        });
        setCurrentPreset('custom');
    };
    
    const handlePresetChange = (name: string) => {
        setEqBands(JSON.parse(JSON.stringify(presets[name])));
        setCurrentPreset(name);
    };

    const handleSignOut = () => {
        setUserInfo(null);
        localStorage.removeItem('userInfo');
        if (window.google) {
            window.google.accounts.id.disableAutoSelect();
        }
        // Reset karaoke state
        setYoutubeSearchQuery('');
        setYoutubeUrlInput('');
        setYoutubeSearchResults([]);
        setYoutubeVideoId('');
        setYoutubeVideoTitle('');
        setAiHelpMessage('');
    };

    const performYoutubeSearch = async (query: string) => {
        if (!query || !aiRef.current) return;
        
        setIsYoutubeSearchLoading(true);
        setYoutubeSearchResults([]);
        setAiHelpMessage('');
        
        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Find 3 high-quality karaoke or instrumental backing track videos on YouTube for the song "${query}". For each video, provide the title, video ID, and a URL for its medium quality thumbnail (e.g., https://i.ytimg.com/vi/VIDEO_ID/mqdefault.jpg).`,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            videos: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        videoId: { type: Type.STRING },
                                        thumbnailUrl: { type: Type.STRING, description: "URL for the video's medium quality thumbnail." }
                                    },
                                    required: ['title', 'videoId', 'thumbnailUrl']
                                }
                            }
                        },
                        required: ['videos']
                    }
                }
            });
            
            const result = JSON.parse(response.text);
            if(result.videos && result.videos.length > 0){
              setYoutubeSearchResults(result.videos);
            } else {
              setAiHelpMessage("AI couldn't find any specific karaoke versions. Try a different search term.");
            }
        } catch (error) {
            console.error("AI search failed:", error);
            setAiHelpMessage("The AI search failed. Please check your connection or try again.");
        } finally {
            setIsYoutubeSearchLoading(false);
        }
    };
    
    const handleYoutubeSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedQuery = youtubeSearchQuery.trim();
        if (trimmedQuery) {
            performYoutubeSearch(trimmedQuery);
            const newHistory = [trimmedQuery, ...youtubeSearchHistory.filter(item => item.toLowerCase() !== trimmedQuery.toLowerCase())].slice(0, 10);
            setYoutubeSearchHistory(newHistory);
        }
        setIsSearchHistoryVisible(false);
    };

    const handleHistoryItemClick = (term: string) => {
        setYoutubeSearchQuery(term);
        performYoutubeSearch(term);
        setIsSearchHistoryVisible(false);
    };

    const handleClearHistory = () => {
        setYoutubeSearchHistory([]);
        setIsSearchHistoryVisible(false);
    };

    const handleLoadYoutubeVideo = (id: string) => {
        setAiHelpMessage('');
        setYoutubeVideoId(id);
    };
    
    const handleYoutubeUrlFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = new URL(youtubeUrlInput);
            const videoId = url.searchParams.get('v');
            if (videoId) {
                handleLoadYoutubeVideo(videoId);
            } else {
                 setAiHelpMessage("Invalid YouTube URL. Please make sure it includes a 'v=' parameter.");
            }
        } catch (error) {
            setAiHelpMessage("Invalid URL format. Please enter a full YouTube video URL.");
        }
    };
    
    const handleKaraokeRecord = () => {
        if (karaokeRecordingStatus === 'idle') {
            if(status !== 'running') {
                alert("Please start the amplifier before recording a performance.");
                return;
            }
            youtubePlayerRef.current?.seekTo(0);
            youtubePlayerRef.current?.playVideo();
            recordedChunksRef.current = [];
            mediaRecorderRef.current?.start();
            setKaraokeRecordingStatus('recording');
        } else {
            youtubePlayerRef.current?.pauseVideo();
            mediaRecorderRef.current?.stop();
            setKaraokeRecordingStatus('idle');
        }
    };

    const handleYoutubeStateChange = (state: string) => {
        if (karaokeRecordingStatus === 'recording') {
            if (state === 'PAUSED' && mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.pause();
            } else if (state === 'PLAYING' && mediaRecorderRef.current?.state === 'paused') {
                mediaRecorderRef.current.resume();
            } else if (state === 'ENDED' && mediaRecorderRef.current?.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                setKaraokeRecordingStatus('idle');
            }
        }
    };

    const handlePlaybackError = async (errorCode: number) => {
        if (!aiRef.current || !youtubeVideoTitle) return;

        const errorMap: { [key: number]: string } = {
            2: "Invalid parameter. The video ID might be malformed.",
            5: "HTML5 player error.",
            100: "Video not found. It may have been deleted or made private.",
            101: "Playback is not allowed in embedded players.",
            150: "Playback is not allowed in embedded players."
        };
        const errorDescription = errorMap[errorCode] || `An unknown error (${errorCode}) occurred`;

        setIsAiLoading(true);
        setAiHelpMessage(`AI Playback Fixer: Video failed (${errorDescription}). Searching for an alternative...`);
        
        try {
            const response = await aiRef.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `The YouTube video "${youtubeVideoTitle}" failed to play. Find the best, working, high-quality, globally available karaoke/instrumental version of this song on YouTube.`,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            bestAlternative: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    videoId: { type: Type.STRING }
                                },
                                required: ['videoId']
                            }
                        },
                        required: ['bestAlternative']
                    }
                }
            });
            const result = JSON.parse(response.text);
            if (result.bestAlternative?.videoId) {
                setAiHelpMessage(`AI Playback Fixer: Found a working version! Loading it now.`);
                setTimeout(() => {
                    handleLoadYoutubeVideo(result.bestAlternative.videoId);
                }, 1500);
            } else {
                setAiHelpMessage("AI Playback Fixer: Couldn't find a reliable alternative.");
            }
        } catch (error) {
            console.error("AI fixer failed:", error);
            setAiHelpMessage("AI Playback Fixer failed. Please try searching for a different song.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatLatency = (v: number) => `${(v * 1000).toFixed(0)} ms`;


    const TabButton = ({ tab, icon, label }: { tab: ControlTab, icon: React.ReactNode, label: string }) => (
        <button onClick={() => setActiveTab(tab)} className={`flex-1 p-3 text-sm md:text-base rounded-md transition-colors duration-200 flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-yellow-400 text-gray-900 font-bold' : 'bg-gray-700 hover:bg-gray-600 text-white'}`} aria-selected={activeTab === tab}>
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 selection:bg-yellow-400 selection:text-gray-900">
            <header className="w-full max-w-7xl text-center mb-4">
                <h1 className="text-5xl md:text-7xl font-anton text-white tracking-wider">
                    <span className="text-yellow-400">ONE-PUNCH</span> AMP
                </h1>
                <p className="text-gray-400 mt-2 text-lg">Your Real-Time Audio Toolkit</p>
            </header>

            <main className="w-full max-w-7xl flex-grow flex flex-col bg-black/20 rounded-2xl shadow-2xl shadow-yellow-400/10 border border-gray-700/50 overflow-hidden">
                <div className="h-48 md:h-64 flex-shrink-0 bg-gray-800/50">
                    <AudioVisualizer analyserNode={analyserNodeRef.current} style={visualizerStyle} />
                </div>
                
                <div className="p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 border-b-2 border-gray-700/50">
                    <div className="flex items-center gap-4">
                        <button onClick={handleStartStop} className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out text-white shadow-lg ${status === 'running' ? 'bg-red-600 hover:bg-red-500 ring-4 ring-red-500/50' : 'bg-green-600 hover:bg-green-500 ring-4 ring-green-500/50'}`} aria-live="polite" aria-label={status === 'running' ? "Stop Amplifier" : "Start Amplifier"}>
                            {status === 'running' ? <StopIcon className="w-12 h-12" /> : <MicrophoneIcon className="w-12 h-12" />}
                        </button>
                         <button onClick={handleRecord} disabled={status !== 'running'} className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors text-white ${status !== 'running' ? 'bg-gray-600 cursor-not-allowed' : isRecording ? 'bg-yellow-400 animate-pulse' : 'bg-gray-800 hover:bg-gray-700'}`} aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}>
                            <RecordIcon className={`w-8 h-8 ${isRecording ? 'text-gray-900' : 'text-red-500'}`} />
                        </button>
                    </div>
                    
                    <div className="flex-grow w-full md:w-auto grid grid-cols-1 md:grid-cols-3 gap-4">
                        <select value={selectedInput} onChange={e => setSelectedInput(e.target.value)} className="bg-gray-800 border-gray-700 border rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-yellow-400">
                            {inputDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                        </select>
                        {hasOutputSelection && (
                            <select value={selectedOutput} onChange={e => setSelectedOutput(e.target.value)} className="bg-gray-800 border-gray-700 border rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-yellow-400">
                                {outputDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label}</option>)}
                            </select>
                        )}
                        <select value={visualizerStyle} onChange={e => setVisualizerStyle(e.target.value as VisualizerStyle)} className="bg-gray-800 border-gray-700 border rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-yellow-400">
                           <option value="onepunch">One-Punch</option>
                           <option value="neon">Neon</option>
                           <option value="gradient">Gradient</option>
                           <option value="classic">Classic</option>
                        </select>
                    </div>
                </div>
                
                <div className="flex-grow p-4 md:p-6 flex flex-col overflow-y-auto">
                    <div className="w-full flex-shrink-0">
                        <div className="flex space-x-2 md:space-x-4 border-b border-gray-700 mb-6">
                           <TabButton tab="amplifier" icon={<VolumeUpIcon className="w-5 h-5"/>} label="Amplifier" />
                           <TabButton tab="equalizer" icon={<SoundWaveIcon className="w-5 h-5"/>} label="Equalizer" />
                           <TabButton tab="effects" icon={<LightningBoltIcon className="w-5 h-5"/>} label="Effects" />
                           <TabButton tab="karaoke" icon={<KaraokeIcon className="w-5 h-5"/>} label="Karaoke" />
                           <TabButton tab="recordings" icon={<FolderIcon className="w-5 h-5"/>} label="Recordings" />
                        </div>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto">
                        {activeTab === 'amplifier' && (
                            <div className="flex flex-col items-center space-y-8 max-w-2xl mx-auto">
                                <EffectSlider label="Gain" value={gain} min="0" max="10" step="0.1" onChange={setGain} unit="x" onReset={() => setGain(1)} />
                                <EffectSlider label="Drive" value={drive} min="0" max="1" step="0.01" onChange={setDrive} onReset={() => setDrive(0)} />
                                <div className="pt-4 border-t border-gray-700 w-full flex justify-center">
                                    <div className="w-full max-w-sm">
                                        <EffectSlider 
                                            label="Latency"
                                            value={latency}
                                            min="0.005"
                                            max="0.2"
                                            step="0.001"
                                            onChange={setLatency}
                                            format={formatLatency}
                                        />
                                        <p className="text-xs text-gray-500 text-center -mt-2">Lower latency is faster but may cause audio crackling on some devices.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'equalizer' && (
                            <EqualizerControl bands={eqBands} onBandChange={handleEqBandChange} postGain={postGain} onPostGainChange={setPostGain} onReset={() => handlePresetChange('flat')} presets={Object.keys(presets)} currentPreset={currentPreset} onPresetChange={handlePresetChange} />
                        )}
                        {activeTab === 'effects' && (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                                    <ToggleSwitch label="Compressor" enabled={compressorEnabled} onChange={setCompressorEnabled} />
                                    {compressorEnabled && <>
                                        <EffectSlider label="Threshold" value={compressor.threshold} min="-100" max="0" step="1" onChange={v => setCompressor(p => ({...p, threshold: v}))} unit="dB" format={v => v.toFixed(0)}/>
                                        <EffectSlider label="Ratio" value={compressor.ratio} min="1" max="20" step="1" onChange={v => setCompressor(p => ({...p, ratio: v}))} format={v => v.toFixed(0)}/>
                                    </>}
                                </div>
                               <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                                    <ToggleSwitch label="Delay" enabled={delayEnabled} onChange={setDelayEnabled} />
                                    {delayEnabled && <>
                                        <EffectSlider label="Time" value={delay.time} min="0.01" max="2" step="0.01" onChange={v => setDelay(p => ({...p, time: v}))} unit="s"/>
                                        <EffectSlider label="Feedback" value={delay.feedback} min="0" max="0.95" step="0.01" onChange={v => setDelay(p => ({...p, feedback: v}))}/>
                                    </>}
                                </div>
                                <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                                    <h3 className="text-lg font-medium text-center">Panner</h3>
                                    <EffectSlider label="Pan" value={panner.pan} min="-1" max="1" step="0.01" onChange={v => setPanner({pan: v})} format={v => v > 0 ? `R ${v.toFixed(2)}` : v < 0 ? `L ${Math.abs(v).toFixed(2)}` : 'C'} onReset={() => setPanner({pan: 0})}/>
                                </div>
                                <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                                     <ToggleSwitch label="Feedback & Noise Gate" enabled={noiseGateEnabled} onChange={setNoiseGateEnabled} />
                                     {noiseGateEnabled && <>
                                         <EffectSlider label="Threshold" value={noiseGate.threshold} min="-100" max="0" step="1" onChange={v => setNoiseGate(p => ({...p, threshold: v}))} unit="dB" format={v => v.toFixed(0)}/>
                                         <EffectSlider label="Release" value={noiseGate.release} min="0.05" max="1" step="0.01" onChange={v => setNoiseGate(p => ({...p, release: v}))} unit="s"/>
                                     </>}
                                </div>
                                <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                                     <ToggleSwitch label="Reverb" enabled={reverbEnabled} onChange={setReverbEnabled} />
                                     {reverbEnabled && <EffectSlider label="Mix" value={reverb.mix} min="0" max="1" step="0.01" onChange={v => setReverb({mix: v})} format={v => `${(v * 100).toFixed(0)}%`}/>}
                                </div>
                           </div>
                        )}
                        {activeTab === 'karaoke' && (
                            <div className="flex flex-col items-center space-y-4">
                                {!userInfo ? (
                                    <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg text-center mt-8">
                                        <h2 className="text-2xl font-bold text-white">Sign In for YouTube Karaoke</h2>
                                        <p className="text-gray-400">Use your Google account to access YouTube search and playback features.</p>
                                        <div id="google-signin-button" className="flex justify-center"></div>
                                    </div>
                                ) : (
                                <>
                                    <div className="w-full max-w-3xl p-4 bg-gray-800/50 rounded-lg space-y-4">
                                        <div className="flex justify-between items-center gap-4">
                                            <div className="flex items-center gap-3">
                                                <img src={userInfo.picture} alt="User profile" className="w-10 h-10 rounded-full" />
                                                <div className="text-left">
                                                    <span className="font-semibold text-white">{userInfo.name}</span>
                                                    <span className="text-xs text-gray-400 block">{userInfo.email}</span>
                                                </div>
                                            </div>
                                            <button onClick={handleSignOut} className="px-3 py-2 text-sm bg-red-600 hover:bg-red-500 rounded-md transition-colors flex-shrink-0">
                                                Sign Out
                                            </button>
                                        </div>
                                        <div className="border-t border-gray-700/50 pt-4">
                                            <ToggleSwitch 
                                                label="Enable Auto Sign-In" 
                                                enabled={isAutoSignInEnabled} 
                                                onChange={setIsAutoSignInEnabled} 
                                            />
                                        </div>
                                    </div>
                                    <div className="relative w-full max-w-xl">
                                        <form onSubmit={handleYoutubeSearch} className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={youtubeSearchQuery} 
                                                onChange={e => setYoutubeSearchQuery(e.target.value)} 
                                                onFocus={() => setIsSearchHistoryVisible(true)}
                                                onBlur={() => setTimeout(() => setIsSearchHistoryVisible(false), 150)}
                                                placeholder="Search for a song..." 
                                                className="flex-grow bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400" 
                                                autoComplete="off"
                                            />
                                            <button type="submit" className="p-2 bg-yellow-400 text-gray-900 rounded-md hover:bg-yellow-300 transition-colors" disabled={isYoutubeSearchLoading}>
                                                {isYoutubeSearchLoading ? '...' : <SearchIcon className="w-6 h-6"/>}
                                            </button>
                                        </form>
                                        {isSearchHistoryVisible && youtubeSearchHistory.length > 0 && (
                                            <div className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                                                <ul className="max-h-60 overflow-y-auto p-2">
                                                    {youtubeSearchHistory.map((item, index) => (
                                                        <li key={index}>
                                                            <button 
                                                                onMouseDown={() => handleHistoryItemClick(item)}
                                                                className="w-full text-left p-2 hover:bg-gray-700 rounded-md transition-colors"
                                                            >
                                                                {item}
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="border-t border-gray-700 mt-1 p-2 text-right">
                                                    <button 
                                                        onMouseDown={handleClearHistory} 
                                                        className="text-sm text-red-400 hover:underline"
                                                    >
                                                        Clear History
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <form onSubmit={handleYoutubeUrlFormSubmit} className="w-full max-w-xl flex gap-2">
                                         <input type="text" value={youtubeUrlInput} onChange={e => setYoutubeUrlInput(e.target.value)} placeholder="...or paste a YouTube URL" className="flex-grow bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                                         <button type="submit" className="p-2 bg-cyan-400 text-gray-900 rounded-md hover:bg-cyan-300 transition-colors">Load</button>
                                    </form>
                                    {isYoutubeSearchLoading && <p>AI is searching...</p>}
                                    <div className="w-full max-w-xl space-y-3">
                                        {youtubeSearchResults.map(video => (
                                            <button 
                                                key={video.videoId} 
                                                onClick={() => handleLoadYoutubeVideo(video.videoId)} 
                                                className="w-full text-left p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-4"
                                            >
                                                <img src={video.thumbnailUrl} alt={`Thumbnail for ${video.title}`} className="w-40 h-24 object-cover rounded-md flex-shrink-0" />
                                                <span className="flex-1 font-medium text-base text-white">{video.title}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {aiHelpMessage && (
                                      <div className={`w-full max-w-xl p-3 rounded-md text-center ${isAiLoading ? 'bg-yellow-600 animate-pulse' : 'bg-blue-800'}`}>
                                          <p className="flex items-center justify-center gap-2"><AiIcon className="w-5 h-5"/> {aiHelpMessage}</p>
                                      </div>
                                    )}
                                    {youtubeVideoId && (
                                        <div className="w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden mt-4">
                                            <YouTubePlayerView 
                                                ref={youtubePlayerRef} 
                                                videoId={youtubeVideoId} 
                                                volume={backingTrackVolume} 
                                                playbackRate={youtubePlaybackRate}
                                                onStateChange={handleYoutubeStateChange} 
                                                onTitleChange={setYoutubeVideoTitle} 
                                                onProgress={(c,d) => {setYoutubeVideoCurrentTime(c); setYoutubeVideoDuration(d);}} 
                                                onError={handlePlaybackError}
                                                onPlaybackRateChange={setYoutubePlaybackRate}
                                            />
                                        </div>
                                    )}
                                    {youtubeVideoId && (
                                       <div className="w-full max-w-3xl space-y-3 pt-4">
                                            <h3 className="text-center font-semibold text-lg">{youtubeVideoTitle || 'Loading...'}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm">{formatTime(youtubeVideoCurrentTime)}</span>
                                                <input type="range" min="0" max={youtubeVideoDuration || 100} value={youtubeVideoCurrentTime} onInput={e => youtubePlayerRef.current?.seekTo(parseFloat((e.target as HTMLInputElement).value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"/>
                                                <span className="font-mono text-sm">{formatTime(youtubeVideoDuration)}</span>
                                            </div>
                                           <div className="p-4 bg-gray-800/50 rounded-lg space-y-4">
                                                <EffectSlider label="Audio Mix" value={backingTrackVolume} min="0" max="100" step="1" onChange={setBackingTrackVolume} format={v => `${v.toFixed(0)}%`} />
                                                <EffectSlider label="Playback Speed" value={youtubePlaybackRate} min="0.5" max="2" step="0.05" onChange={setYoutubePlaybackRate} format={v => `${v.toFixed(2)}x`} onReset={() => setYoutubePlaybackRate(1)} />
                                                <button onClick={handleKaraokeRecord} disabled={!youtubeVideoId || status !== 'running'} className={`w-full p-3 rounded-lg flex items-center justify-center gap-2 text-lg font-bold transition-colors ${status !== 'running' ? 'bg-gray-600 cursor-not-allowed' : karaokeRecordingStatus === 'idle' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}>
                                                    {karaokeRecordingStatus === 'idle' ? <><PlayIcon className="w-6 h-6"/> Record Performance</> : <><StopIcon className="w-6 h-6"/> Stop Recording</>}
                                                </button>
                                           </div>
                                       </div>
                                    )}
                                </>
                                )}
                            </div>
                        )}
                        {activeTab === 'recordings' && <RecordingHistory recordings={recordings} onDelete={handleDeleteRecording} />}
                    </div>
                </div>
            </main>

            <footer className="w-full max-w-7xl text-center py-4 mt-4 text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} One-Punch Amp. All rights reserved.</p>
                <div className="flex justify-center items-center gap-2">
                    <button onClick={() => setIsPrivacyPolicyOpen(true)} className="underline hover:text-white">Privacy Policy</button>
                    <span className="text-gray-600">|</span>
                    <button onClick={() => setIsTermsOpen(true)} className="underline hover:text-white">Terms & Conditions</button>
                </div>
            </footer>

            <PrivacyPolicy isOpen={isPrivacyPolicyOpen} onClose={() => setIsPrivacyPolicyOpen(false)} />
            <TermsAndConditions isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
        </div>
    );
};

export default App;
