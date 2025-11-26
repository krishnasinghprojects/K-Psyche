#!/usr/bin/env python3
"""
Audio Transcription Worker using faster-whisper
Optimized for RTX 3050 (4GB/6GB VRAM) with int8 quantization
"""

import sys
import argparse
import os
from pathlib import Path

def transcribe_audio(audio_path, model_size="small", language=None, device="cuda", compute_type="int8"):
    """
    Transcribe audio file using faster-whisper
    
    Args:
        audio_path: Path to audio file
        model_size: Model size (tiny, base, small, medium, large-v2, large-v3, distil-large-v3)
        language: Language code (None for auto-detection)
        device: Device to use (cuda, cpu)
        compute_type: Computation type (int8, float16, float32)
    
    Returns:
        Transcribed text
    """
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("ERROR: faster-whisper not installed. Run: pip install faster-whisper", file=sys.stderr)
        sys.exit(1)
    
    # Validate audio file exists
    if not os.path.exists(audio_path):
        print(f"ERROR: Audio file not found: {audio_path}", file=sys.stderr)
        sys.exit(1)
    
    # Check CUDA availability
    import torch
    if device == "cuda" and not torch.cuda.is_available():
        print("WARNING: CUDA not available, falling back to CPU", file=sys.stderr)
        device = "cpu"
        compute_type = "int8"  # CPU supports int8
    
    # Log configuration
    print(f"INFO: Loading model '{model_size}' on {device} with {compute_type}", file=sys.stderr)
    
    # Initialize model with optimized settings for RTX 3050
    model = WhisperModel(
        model_size,
        device=device,
        compute_type=compute_type,
        cpu_threads=4,  # Optimize for i5 13th Gen
        num_workers=1   # Reduce memory overhead
    )
    
    # Transcribe with optimized parameters
    segments, info = model.transcribe(
        audio_path,
        language=language,
        beam_size=5,           # Balance between speed and accuracy
        vad_filter=True,       # Voice Activity Detection to skip silence
        vad_parameters=dict(
            min_silence_duration_ms=500,
            threshold=0.5
        ),
        temperature=0.0,       # Deterministic output
        compression_ratio_threshold=2.4,
        log_prob_threshold=-1.0,
        no_speech_threshold=0.6
    )
    
    # Log detected language
    print(f"INFO: Detected language: {info.language} (probability: {info.language_probability:.2f})", file=sys.stderr)
    
    # Collect all segments
    transcription_parts = []
    for segment in segments:
        transcription_parts.append(segment.text.strip())
    
    # Join and return full transcription
    full_transcription = " ".join(transcription_parts).strip()
    
    if not full_transcription:
        print("WARNING: No speech detected in audio", file=sys.stderr)
        return ""
    
    return full_transcription


def main():
    parser = argparse.ArgumentParser(description="Transcribe audio using faster-whisper")
    parser.add_argument("audio_path", help="Path to audio file")
    parser.add_argument("--model", default="small", 
                       choices=["tiny", "base", "small", "medium", "large-v2", "large-v3", "distil-large-v3"],
                       help="Whisper model size (default: small)")
    parser.add_argument("--language", default=None, help="Language code (e.g., en, es, fr). Auto-detect if not specified")
    parser.add_argument("--device", default="cuda", choices=["cuda", "cpu"], help="Device to use")
    parser.add_argument("--compute-type", default="int8", 
                       choices=["int8", "float16", "float32"],
                       help="Compute type (int8 recommended for RTX 3050)")
    
    args = parser.parse_args()
    
    try:
        # Perform transcription
        transcription = transcribe_audio(
            args.audio_path,
            model_size=args.model,
            language=args.language,
            device=args.device,
            compute_type=args.compute_type
        )
        
        # Output ONLY the transcription to stdout (Node.js captures this)
        print(transcription)
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
