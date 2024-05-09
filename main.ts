namespace MidiSongExtension {
    export class MidiSong {
        public name: string;
        public artist: string;
        public bpm: number;

        // auto-generated song data buffer, data format explained in MidiSongExtension.DataParsing.getNoteFromBufferV2.
        public songData: Buffer;

        // array of instrument functions. midi channel - 1 is the instrument chosen
        // ex: midi channel 9 uses instrumentMap[8].
        public instrumentMap: Instruments.InstrumentFunction[];

        // a seperate array of the notes this midi uses. auto-generated.
        // needed since there are 109 possible notes but note pitch index is stored in 3 bits
        public playedNoteMap: Buffer; 

        constructor(name: string, artist: string, bpm: number, songData: Buffer, instrumentMap: Instruments.InstrumentFunction[], playedNoteMap: Buffer) {
            this.name = name;
            this.artist = artist;
            this.bpm = bpm;
            this.songData = songData;
            this.instrumentMap = instrumentMap;
            this.playedNoteMap = playedNoteMap;
        }
    }
    export class MidiPlayer {
        public static activeSongList: MidiSong[]; // #TODO add multiple song support?
        public static initialized: boolean = false;
        public static playing: boolean = false;

        // song playing variables
        public static lastNoteChange = 0;
        public static msPer16th = 0; 
        public static restingTime = 0; // 16th rests to wait before playing again 
        public static bufferOffsetIndex = 0; // where is the current song in the buffer
        public static currentParityBit = 0; // same parity bit notes played at same time

        public static  nextNoteData: number[];
        public static  lastNoteData: number[];

        // #TODO switch to system that doesnt count total time? for playing song at given time
        private static Initialize(): void {
            let flipParityBit = function() {
                MidiPlayer.currentParityBit = 1 - MidiPlayer.currentParityBit;
            };
            this.initialized = true;
            game.onUpdate(function () {
                if (MidiPlayer.playing) {
                    if (MidiPlayer.lastNoteChange + MidiPlayer.msPer16th <= game.runtime()) {
                        if (MidiPlayer.restingTime >= MidiPlayer.msPer16th) {
                            MidiPlayer.restingTime -= MidiPlayer.msPer16th;
                        } else {
                            flipParityBit();
                            while (MidiPlayer.nextNoteData[0] == MidiPlayer.currentParityBit) {
                                if (MidiPlayer.nextNoteData[1] != 0) {
                                    Instruments.PlayNote(
                                        MidiPlayer.activeSongList[0].instrumentMap[MidiPlayer.nextNoteData[4] - 1],
                                        DataParsing.noteIndexToFrequency(MidiPlayer.activeSongList[0].playedNoteMap.getNumber(NumberFormat.UInt8BE, MidiPlayer.nextNoteData[2])),
                                        (MidiPlayer.nextNoteData[3] + 1) * MidiPlayer.msPer16th);
                                } else {
                                    MidiPlayer.restingTime = (MidiPlayer.nextNoteData[2] - 1) * MidiPlayer.msPer16th;
                                }
                                MidiPlayer.bufferOffsetIndex++;
                                MidiPlayer.lastNoteData = MidiPlayer.nextNoteData;
                                MidiPlayer.nextNoteData = MidiPlayer.GetNextNote();
                            }

                        }
                        MidiPlayer.lastNoteChange += MidiPlayer.msPer16th;
                    } 
                }
            })
        }

        public static GetNextNote(): number[] {
            return DataParsing.getNoteFromBufferV2(MidiPlayer.activeSongList[0].songData, MidiPlayer.bufferOffsetIndex);
        }

        public static Start(toPlay: MidiSong): void {
            game.splash("playing " + toPlay.name, "by " + toPlay.artist);
            if (!MidiPlayer.initialized) {
                MidiPlayer.Initialize();
            }
            MidiPlayer.activeSongList = [toPlay];
            MidiPlayer.nextNoteData = MidiPlayer.GetNextNote();
            MidiPlayer.msPer16th = DataParsing.BPMtoMSp16th(toPlay.bpm);
            MidiPlayer.playing = true;
        }

        public static Stop(): void {
            MidiPlayer.activeSongList = [];
            MidiPlayer.playing = false;
            MidiPlayer.msPer16th = 0;
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
    export function noteIndexToFrequency(noteIndex: number): number {
        return midiNoteFrequencyMap[noteIndex];
    }

    // get amount of ms per 16th note based on bpm
    export function BPMtoMSp16th(bpm: number) {
        return 1000 * 16 / bpm;
    }

    // #TODO add one more bit to channel, remove one bit from playTime?
    // get a note from the buffer. format:
    // bit 1 is parity. notes played at the same time have the same parity
    // bit 2 is rest. 1 for rest, 0 for note.
    // if b2==1, next 14 bits are rest time
    // if b2==0, next 6 bits are pitch, then 5 bits playTime, then 3 bits channel
    export function getNoteFromBufferV2(fullMidiBuffer: Buffer, noteIndex: number): number[] {
        let noteBuff = fullMidiBuffer.getNumber(NumberFormat.UInt16BE, noteIndex * 2);
        let parityBit = noteBuff >> 15;
        let restBit = (noteBuff >> 14) & 0x01;

        if (restBit == 0) {
            let restTime = noteBuff & 0x3FFF;
            return [parityBit, restBit, restTime + 1];
        }
        let pitchIndex = (noteBuff >> 8) & 0x3F
        let playTime = ((noteBuff >> 3) & 0x1F) + 1;
        let channel = noteBuff & 0x7;
        return [parityBit, restBit, pitchIndex, playTime, channel];
    }
}

// a few instruments to play
namespace MidiSongExtension.Instruments {
    export type InstrumentFunction = (pitch: number, length: number, vol?: number) => void; 
    export function PlayNote(instrumentFunction: InstrumentFunction, pitch: number, length: number): void {
        instrumentFunction(pitch, length); //#FIXME vol parameter when not given gets set to 'undefined'
    }

    // blank instrument to ignore a channel
    export const noSound: InstrumentFunction = (freq, length, vol = 255) => {

    }

    // credit for piano to ThatUruguayanGuy
    // from https://forum.makecode.com/t/various-instruments-recreated-in-makecode-arcade/24040
    export const acousticGrand: InstrumentFunction = (freq, length, vol = 255) => {
        if(vol === undefined)
            vol = 255;
        music.play(music.createSoundEffect(
            WaveShape.Sine,
            freq,
            freq,
            255 * vol / 255,
            0,
            length,
            SoundExpressionEffect.None,
            InterpolationCurve.Linear
        ), music.PlaybackMode.InBackground)
        music.play(music.createSoundEffect(
            WaveShape.Sine,
            freq * 2,
            freq * 2,
            255 * vol / 255,
            0,
            length,
            SoundExpressionEffect.None,
            InterpolationCurve.Linear
        ), music.PlaybackMode.InBackground)
        music.play(music.createSoundEffect(
            WaveShape.Sine,
            freq * 3,
            freq * 3,
            227 * vol / 255,
            0,
            length,
            SoundExpressionEffect.None,
            InterpolationCurve.Linear
        ), music.PlaybackMode.InBackground)
        music.play(music.createSoundEffect(
            WaveShape.Sine,
            freq * 4,
            freq * 4,
            227 * vol / 255,
            0,
            length,
            SoundExpressionEffect.None,
            InterpolationCurve.Linear
        ), music.PlaybackMode.InBackground)
    }

    // credit for piano to ThatUruguayanGuy
    // from https://forum.makecode.com/t/various-instruments-recreated-in-makecode-arcade/24040
    export const brightAcoustic: InstrumentFunction = (freq, length, vol = 255) => {
        if (vol === undefined)
            vol = 255;
        music.play(music.createSoundEffect(
            WaveShape.Sine,
            freq,
            freq,
            255 * vol / 255,
            0,
            length,
            SoundExpressionEffect.None,
            InterpolationCurve.Linear
        ), music.PlaybackMode.InBackground)
        music.play(music.createSoundEffect(
            WaveShape.Sine,
            freq * 2,
            freq * 2,
            255 * vol / 255,
            0,
            length,
            SoundExpressionEffect.None,
            InterpolationCurve.Linear
        ), music.PlaybackMode.InBackground)
        music.play(music.createSoundEffect(
            WaveShape.Sine,
            freq * 3,
            freq * 3,
            227 * vol / 255,
            0,
            length,
            SoundExpressionEffect.None,
            InterpolationCurve.Linear
        ), music.PlaybackMode.InBackground)
        music.play(music.createSoundEffect(
            WaveShape.Sine,
            freq * 4,
            freq * 4,
            227 * vol / 255,
            0,
            length,
            SoundExpressionEffect.None,
            InterpolationCurve.Linear
        ), music.PlaybackMode.InBackground)
        music.play(music.createSoundEffect(
            WaveShape.Sine,
            freq * 5,
            freq * 5,
            205 * vol / 255,
            0,
            length,
            SoundExpressionEffect.None,
            InterpolationCurve.Linear
        ), music.PlaybackMode.InBackground)
        music.play(music.createSoundEffect(
            WaveShape.Sine,
            freq * 6,
            freq * 6,
            205 * vol / 255,
            0,
            length,
            SoundExpressionEffect.None,
            InterpolationCurve.Linear
        ), music.PlaybackMode.InBackground)
    }

    // simple but somewhat poor base
    export const badBass: InstrumentFunction = (freq, length, vol = 100) => {
        if (vol === undefined)
            vol = 100;
        let melod = new music.Melody("~15 @1,0,90,1 !200,90^1");
        melod.play(vol);
    }

    // pretty solid high-hat
    export const hiHat: InstrumentFunction = (freq, length, vol = 100) => {
        if (vol === undefined)
            vol = 100;
        let melod = new music.Melody("@0,50,0,0 ~5 " + "c1-99999 ");
        melod.play(vol);
    }

    // manual stopping since caused issues without
    let saws: music.Melody[] = [];
    export const sawMaybe: InstrumentFunction = (freq, length, vol = 80) => {
        if (vol === undefined)
            vol = 80;
        while (saws.length > 0) {
            saws.pop().stop();
        }
        // reduce time since still caused issues
        //length -= 2500 / 46; 
        //length /= 1.5; // equivalent to above roughly?
        length -= MidiPlayer.msPer16th / 2; //#FIXME odd workaround to saw waves not behaving properly
        let melodA = new music.Melody("~2 @10,1,255,40 !" + freq + "," + length);
        let melodB = new music.Melody("~2 @10,1,255,40 !" + (freq / 2) + "," + length);

        // alter volumes? #TODO
        melodA.play(vol);
        melodB.play(vol);

        saws.push(melodA);
        saws.push(melodB);
    }
}