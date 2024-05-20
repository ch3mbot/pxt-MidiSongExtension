namespace MidiSongExtension {
    export class MidiSong {
        public name: string;
        public artist: string;
        public resolution: number;

        // auto-generated song data buffer, data format explained in MidiSongExtension.DataParsing.getNoteFromBufferV3.
        public songData: Buffer;

        // array of instrument functions. midi channel - 1 is the instrument chosen
        // ex: midi channel 9 uses instrumentMap[8].
        public instrumentMap: Instruments.InstrumentFunction[];

        // array of instrument volume overrides. 0-255. undefined for default volume.
        public volumeOverrideMap: (number | undefined)[];

        constructor(name: string, artist: string, resolution: number, songData: Buffer, instrumentMap: Instruments.InstrumentFunction[], volumeOverrideMap: (number | undefined)[]) {
            this.name = name;
            this.artist = artist;
            this.resolution = resolution;
            this.songData = songData;
            this.instrumentMap = instrumentMap;
            this.volumeOverrideMap = volumeOverrideMap;
        }
    }
    export class MidiPlayer {
        public static activeSong: MidiSong;
        public static playing: boolean = false;

        public static resolution: number; // the number of ms every midi event is rounded to (start, duration, etc)
        public static timePerChunk: number; // how many ms is each chunk
        public static timeBuffer: number; // ms things are queued ahead of time

        public static chunkTime = 0; // time the current chunk started
        public static bufferOffsetIndex = 0; // where in the buffer is the song. every note is 4 nibbles.

        public static nextNoteData: number[];
        public static lastNoteData: number[]; // #FIXME why track last note?

        public static debugSprite: Sprite;
        public static usingDebugSprite: boolean = false;

        // when a chunk indicator is hit process it and set other time variables.
        private static ProcessChunkIndicator() {
            if (MidiPlayer.nextNoteData[0] != 1)
                game.splash("cannot process non chunk");

            // add to chunk time
            MidiPlayer.chunkTime += MidiPlayer.timePerChunk;

            // advance
            MidiPlayer.bufferOffsetIndex++;
            MidiPlayer.lastNoteData = MidiPlayer.nextNoteData;
            MidiPlayer.nextNoteData = MidiPlayer.GetNextNote();
        }

        // queue up found notes until a new chunk indicator is hit.
        private static QueueUntilNextChunk() {
            let notesQueued = 0;
            while (MidiPlayer.nextNoteData[0] != 1) {
                // get and process note info
                let runtime = game.runtime();
                let trueStartMs = MidiPlayer.nextNoteData[1] * MidiPlayer.resolution + MidiPlayer.chunkTime - runtime;
                let duration = MidiPlayer.nextNoteData[2] * MidiPlayer.resolution;
                let pitch = DataParsing.NoteIndexToFrequency(MidiPlayer.nextNoteData[3]);
                let channel = MidiPlayer.nextNoteData[4];
                
                // call appropriate instrument function
                Instruments.PlayNote(
                    MidiPlayer.activeSong.instrumentMap[channel],
                    pitch,
                    trueStartMs,
                    duration,
                    MidiPlayer.activeSong.volumeOverrideMap[channel]
                );

                // advance
                MidiPlayer.bufferOffsetIndex++;
                MidiPlayer.lastNoteData = MidiPlayer.nextNoteData;
                MidiPlayer.nextNoteData = MidiPlayer.GetNextNote();

                notesQueued++;
            }
            if(MidiPlayer.usingDebugSprite) 
                MidiPlayer.debugSprite.sayText("queued " + notesQueued + " notes", MidiPlayer.timeBuffer / 2);
        }

        public static SetupDebugSprite(debugSprite: Sprite) {
            MidiPlayer.debugSprite = debugSprite;
            MidiPlayer.usingDebugSprite = true;
        }

        public static Start(song: MidiSong, resolution: number, timeBuffer: number): void {
            // get the song
            MidiPlayer.activeSong = song;
            MidiPlayer.playing = true;
        
            // get important song playing data
            MidiPlayer.resolution = resolution;
            MidiPlayer.timePerChunk = 2048 * MidiPlayer.resolution;
            MidiPlayer.timeBuffer = timeBuffer;

            // reset chunkTime and bufferIndex
            MidiPlayer.chunkTime = 0;
            MidiPlayer.bufferOffsetIndex = 0;

            // reset last note? needed? #FIXME
            MidiPlayer.lastNoteData = [];

            // get first noteBuff
            MidiPlayer.nextNoteData = MidiPlayer.GetNextNote();

            // queue first chunk
            MidiPlayer.QueueUntilNextChunk();

            // twice per timeBuffer check if next block of notes should be queued.
            game.onUpdateInterval(MidiPlayer.timeBuffer / 2, function () {
                // if within buffer, advance chunk, and queue up next chunk of notes
                if (MidiPlayer.chunkTime + MidiPlayer.timePerChunk - game.runtime() < MidiPlayer.timeBuffer) {
                    MidiPlayer.ProcessChunkIndicator();
                    MidiPlayer.QueueUntilNextChunk();
                }
            });
        }

        // #FIXME figure out how to stop midi song only.
        public static Stop(): void {
            music.stopAllSounds();
        }

        public static GetNextNote(): number[] {
            return DataParsing.GetNoteFromBuffer(MidiPlayer.activeSong.songData, MidiPlayer.bufferOffsetIndex);
        }
    }
}

namespace MidiSongExtension.DataParsing {
    // could be reduced to playable note range
    export const midiNoteFrequencyMap: { [key: number]: number } = {
        0: 8.1758,
        1: 8.66196,
        2: 9.17702,
        3: 9.72272,
        4: 10.3009,
        5: 10.9134,
        6: 11.5623,
        7: 12.25,
        8: 12.9783,
        9: 13.75,
        10: 14.5676,
        11: 15.4339,
        12: 16.3516,
        13: 17.3239,
        14: 18.354,
        15: 19.4454,
        16: 20.6017,
        17: 21.8268,
        18: 23.1247,
        19: 24.4997,
        20: 25.9565,
        21: 27.5,
        22: 29.1352,
        23: 30.8677,
        24: 32.7032,
        25: 34.6478,
        26: 36.7081,
        27: 38.8909,
        28: 41.2034,
        29: 43.6535,
        30: 46.2493,
        31: 48.9994,
        32: 51.9131,
        33: 55,
        34: 58.2705,
        35: 61.7354,
        36: 65.4064,
        37: 69.2957,
        38: 73.4162,
        39: 77.7817,
        40: 82.4069,
        41: 87.3071,
        42: 92.4986,
        43: 97.9989,
        44: 103.826,
        45: 110,
        46: 116.541,
        47: 123.471,
        48: 130.813,
        49: 138.591,
        50: 146.832,
        51: 155.563,
        52: 164.814,
        53: 174.614,
        54: 184.997,
        55: 195.998,
        56: 207.652,
        57: 220,
        58: 233.082,
        59: 246.942,
        60: 261.626,
        61: 277.183,
        62: 293.665,
        63: 311.127,
        64: 329.628,
        65: 349.228,
        66: 369.994,
        67: 391.995,
        68: 415.305,
        69: 440,
        70: 466.164,
        71: 493.883,
        72: 523.251,
        73: 554.365,
        74: 587.33,
        75: 622.254,
        76: 659.255,
        77: 698.456,
        78: 739.989,
        79: 783.991,
        80: 830.609,
        81: 880,
        82: 932.328,
        83: 987.767,
        84: 1046.5,
        85: 1108.73,
        86: 1174.66,
        87: 1244.51,
        88: 1318.51,
        89: 1396.91,
        90: 1479.98,
        91: 1567.98,
        92: 1661.22,
        93: 1760,
        94: 1864.66,
        95: 1975.53,
        96: 2093,
        97: 2217.46,
        98: 2349.32,
        99: 2489.02,
        100: 2637.02,
        101: 2793.83,
        102: 2959.96,
        103: 3135.96,
        104: 3322.44,
        105: 3520,
        106: 3729.31,
        107: 3951.07,
        108: 4186.01,
    };

    // from midi index to actual pitch
    export function NoteIndexToFrequency(noteIndex: number): number {
        return midiNoteFrequencyMap[noteIndex];
    }

    export function GetNoteFromBuffer(fullMidiBufferV3: Buffer, noteIndex: number): number[] {
        //buffer is split into two seperate 16 bit uints, since typescript 32 bit numbers behaved poorly
        let noteBuffA = fullMidiBufferV3.getNumber(NumberFormat.UInt16BE, noteIndex * 4);
        let noteBuffB = fullMidiBufferV3.getNumber(NumberFormat.UInt16BE, (noteIndex * 4) + 2);

        // 1 bit chunk
        // 11 bits relative start
        // 4 bits channel
        let chunkBit = (noteBuffA >> 15); // 1        
        let relativeStartMs = (noteBuffA & 0x7FF0) >> 4; // 11 0111111111110000
        let channel = noteBuffA & 0xF; // 4 000000000000111

        // 9 bits duration
        // 7 bits pitch
        let durationMs = (noteBuffB & 0xFF80) >> 7;; // 9  1111111110000000
        let pitch = noteBuffB & 0x7F; // 7 0000000001111111

        return [chunkBit, relativeStartMs, durationMs, pitch, channel];
    }
}

// a few instruments to play
namespace MidiSongExtension.Instruments {
    // generic instrument function
    export type InstrumentFunction = (frequency: number, startTime: number, duration: number, volume?: number) => void;

    // generate instrument from a table of pitch:amplitude pairs
    function GenerateSineWaveInstrument(waveTable: number[][], baseFreqIndex: number, loudestIndex: number, releaseOverlap: boolean, durationOffset: number, defaultVolume: number): InstrumentFunction {
        return (frequency: number, startTime: number, duration: number, volume?: number) => {
            if (volume == undefined)
                volume = defaultVolume;
            for (let waveData of waveTable) {
                quasiParsePlay("~3, @1,1,255,1 !" + frequency * waveData[0] / waveTable[baseFreqIndex][0], startTime, duration + durationOffset, volume * DBtoAmp(waveData[1] - waveTable[loudestIndex][1]), releaseOverlap);
            }
        };
    }

    // play a note given an instrument function, pitch (hz), and a length (ms)
    export function PlayNote(instrumentFunction: InstrumentFunction, pitch: number, startTime: number, duration: number, volume?: number): void {
        instrumentFunction(pitch, startTime, duration, volume);
    }

    // formula to convert from decibels to amplitude
    export function DBtoAmp(db: number): number {
        return Math.pow(10, db / 20);
    }

    // add a note to an instrument buffer
    export function addNote(sndInstr: Buffer, sndInstrPtr: number, ms: number, beg: number, end: number, soundWave: number, hz: number, volume: number, endHz: number) {
        if (ms > 0) {
            sndInstr.setNumber(NumberFormat.UInt8LE, sndInstrPtr, soundWave)
            sndInstr.setNumber(NumberFormat.UInt8LE, sndInstrPtr + 1, 0)
            sndInstr.setNumber(NumberFormat.UInt16LE, sndInstrPtr + 2, hz)
            sndInstr.setNumber(NumberFormat.UInt16LE, sndInstrPtr + 4, ms)
            sndInstr.setNumber(NumberFormat.UInt16LE, sndInstrPtr + 6, (beg * volume) >> 6)
            sndInstr.setNumber(NumberFormat.UInt16LE, sndInstrPtr + 8, (end * volume) >> 6)
            sndInstr.setNumber(NumberFormat.UInt16LE, sndInstrPtr + 10, endHz);
            sndInstrPtr += BUFFER_SIZE;
        }
        sndInstr.setNumber(NumberFormat.UInt8LE, sndInstrPtr, 0) // terminate
        return sndInstrPtr
    }

    const BUFFER_SIZE = 12;
    export function quasiParsePlay(melodyStr: string, startTime: number, duration: number, volume: number, releaseOverlap: boolean) {
        volume = Math.max(0, Math.min(255, (volume * music.volume()) >> 8));

        // 1 - triangle, 3 - sine, etc.
        let waveform = 0;

        // endHz=startHz by default
        let startHz = 0;
        let endHz = 0;

        // attack sustain decay release - ms,ms,vol,ms
        let envA = 0;
        let envD = 0;
        let envS = 255;
        let envR = 0;

        let charIndex = 0;

        let ms = 0; // ms of the tone? unsure

        //check if char is digit
        let isDigit: (character: string) => boolean = function (character: string): boolean {
            return !isNaN(parseInt(character));
        }

        // parse the next number until not a number
        let parseNextNumber: () => number = function (): number {
            let numStr = "";
            let isFloat = false;
            while (charIndex < melodyStr.length && (isDigit(melodyStr.charAt(charIndex)) || melodyStr.charAt(charIndex) == ".")) {
                isFloat = isFloat || (melodyStr.charAt(charIndex) == ".");
                numStr += melodyStr.charAt(charIndex);
                charIndex++;
            }
            if (isFloat)
                return parseFloat(numStr);
            return parseInt(numStr);
        }

        // get relevant data from fake melody string
        while (charIndex < melodyStr.length) {
            switch (melodyStr.charAt(charIndex)) {
                case " ":
                    charIndex++;
                    break;
                case "~":
                    charIndex++;
                    waveform = parseNextNumber();
                    break;
                case "@":
                    charIndex++;
                    envA = parseNextNumber();
                    charIndex++;
                    envD = parseNextNumber();
                    charIndex++;
                    envS = parseNextNumber();
                    charIndex++;
                    envR = parseNextNumber();
                    break;
                case "!":
                    charIndex++;
                    startHz = parseNextNumber();
                    endHz = startHz;
                    if (charIndex < melodyStr.length && melodyStr.charAt(charIndex) == ",") {
                        charIndex++;
                        ms = parseNextNumber();
                    }
                    if (charIndex < melodyStr.length && melodyStr.charAt(charIndex) == "^") {
                        charIndex++;
                        endHz = parseNextNumber();
                    }
                    break;
                default:
                    charIndex++;
                    break;
            }
        }

        // set up instruction buffer #FIXME why 5 * BUFFER_SIZE?
        let sndInstr = control.createBuffer(5 * BUFFER_SIZE)
        let sndInstrPtr = 0

        const addForm = (formDuration: number, beg: number, end: number, msOff: number) => {
            let freqStart = startHz;
            let freqEnd = endHz;

            const envelopeWidth = ms > 0 ? ms : duration * 125 + envR;
            if (endHz != startHz && envelopeWidth != 0) {
                const slope = (freqEnd - freqStart) / envelopeWidth;
                freqStart = startHz + slope * msOff;
                freqEnd = startHz + slope * (msOff + formDuration);
            }
            sndInstrPtr = addNote(sndInstr, sndInstrPtr, formDuration, beg, end, waveform, freqStart, volume, freqEnd);
        }

        let currMs = ms

        // if ms not given, default to  duration provided?
        if (currMs <= 0) {
            //const beat = 125;
            currMs = duration //* beat
        }

        // add the four waveforms. #FIXME some parts changed from melodyPlayer, may not behave correctly.
        sndInstrPtr = 0; // what does this dp
        addForm(envA, 0, 255, 0);
        addForm(envD, 255, envS, envA);
        if (releaseOverlap) {
            addForm(currMs - (envA + envD), envS, envS, envD + envA)
            addForm(envR, envS, 0, currMs)
            //addForm(duration - (envA + envD), envS, envS, envD + envA); // dont add release? release plays during next note? #FIXME 
            //addForm(envR, envS, 0, duration); // start this waveform at duration?
        } else {
            addForm(currMs - (envA + envD + envR), envS, envS, envD + envA);
            addForm(envR, envS, 0, currMs - envR);
            //addForm(duration - (envA + envD + envR), envS, envS, envD + envA);
            //addForm(envR, envS, 0, duration - envR);
        }


        //game.splash("playing wave " + waveform, "at hz: " + startHz);
        // actually play it
        music.playInstructions(startTime, sndInstr.slice(0, sndInstrPtr))
    }

    // blank instrument to ignore a channel
    export const NoSound: InstrumentFunction = (frequency, startTime, duration, volume) => {

    }

    // attempted guitar sound #TODO make work with envelope 
    let guitarSoundWaveTable = [
        [56, -64],
        [82, -26.3],
        [125, -68.7],
        [165, -15.9],
        [248, -19.7],
        [331, -32.2],
        [414, -36.6],
        [496, -26.3],
        [579, -32.7],
        [661, -56.7],

    ];
    export const AcousticGuitar = GenerateSineWaveInstrument(guitarSoundWaveTable, 1, 3, false, -10, 255);

    // credit for piano to ThatUruguayanGuy
    // from https://forum.makecode.com/t/various-instruments-recreated-in-makecode-arcade/24040
    let acousticGrandWaveTable = [
        [1, 0],
        [2, 0],
        [3, -1.01],
        [4, -1.01],
    ]
    export const AcousticGrandPiano = GenerateSineWaveInstrument(acousticGrandWaveTable, 0, 0, true, 0, 100);

    // credit for piano to ThatUruguayanGuy
    // from https://forum.makecode.com/t/various-instruments-recreated-in-makecode-arcade/24040
    let brightAcousticWaveTable = [
        [1, 0],
        [2, 0],
        [3, -1.01],
        [4, -1.01],
        [5, -1.89],
        [6, -1.89],
    ]
    export const BrightAcousticPiano = GenerateSineWaveInstrument(brightAcousticWaveTable, 0, 0, false, -6, 80);

    // simple bass with 2 saw waves
    export const SawBass: InstrumentFunction = (frequency, startTime, duration, volume) => {
        //let idkBuf = doBuffer(duration, 1.0, 1.0, 2, frequency, 255, frequency);
        //music.playInstructions(startTime, idkBuf);
        //let melodAdk = new music.Melody("~2 @10,1,255,40 !" + frequency + "," + duration);
        //dunno(melodAdk, startTime);
        //quasiParsePlay("~2 @10,1,255,40 !" + frequency, startTime, duration - 30, volume, false);
        if(volume == undefined)
            volume = 80;
        duration -= 0;
        quasiParsePlay("~2 @10,1,255,40 !" + frequency + "," + duration, startTime, duration, volume, false);
        quasiParsePlay("~2 @10,1,255,40 !" + (frequency / 2) + "," + duration, startTime, duration, volume, false);
        //game.splash("sawing at: " + frequency, + "for " + duration);
    }

    // simple but somewhat poor bass drum made with sine wave 
    export const BassDrum: InstrumentFunction = (frequency, startTime, duration, volume) => {
        if (volume == undefined)
            volume = 100;
        quasiParsePlay("~15 @1,1,90,1 !200,90^1", startTime, duration - 25, volume, false);
    }

    // pretty solid hi-hat made from noise
    export const HiHat: InstrumentFunction = (frequency, startTime, duration, volume) => {
        if (volume == undefined)
            volume = 100;
        quasiParsePlay("~5 @0,50,0,0 !37", startTime, duration, volume, false);
    }
}