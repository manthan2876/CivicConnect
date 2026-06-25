import 'dart:async';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:path/path.dart' as p;
import 'package:speech_to_text/speech_to_text.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:file_picker/file_picker.dart';

class AudioRecordingWidget extends StatefulWidget {
  final Function(String?, String?) onRecordingComplete; // (filePath, transcription)

  const AudioRecordingWidget({super.key, required this.onRecordingComplete});

  @override
  State<AudioRecordingWidget> createState() => _AudioRecordingWidgetState();
}

class _AudioRecordingWidgetState extends State<AudioRecordingWidget> {
  late AudioRecorder _audioRecorder;
  final SpeechToText _speechToText = SpeechToText();
  bool _isRecording = false;
  String? _audioPath;
  String _lastWords = '';
  Timer? _timer;
  int _recordDuration = 0;

  @override
  void initState() {
    super.initState();
    _audioRecorder = AudioRecorder();
    _initSpeech();
  }

  void _initSpeech() async {
    try {
      await _speechToText.initialize(
        onError: (error) => debugPrint('STT Error: $error'),
        onStatus: (status) => debugPrint('STT Status: $status'),
      );
      if (mounted) setState(() {});
    } catch (e) {
      debugPrint('STT Initialization failed: $e');
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _audioRecorder.dispose();
    _speechToText.stop();
    super.dispose();
  }

  Future<void> _pickAudioFile() async {
    try {
      final FilePickerResult? result = await FilePicker.platform.pickFiles(
        type: FileType.audio,
      );

      if (result != null && result.files.single.path != null) {
        final path = result.files.single.path;
        setState(() {
          _audioPath = path;
          _recordDuration = 0;
          _lastWords = '';
        });
        widget.onRecordingComplete(path, null);
      }
    } catch (e) {
      debugPrint('Error picking audio file: $e');
    }
  }

  Future<void> _start() async {
    try {
      bool hasMicPermission = await _audioRecorder.hasPermission();
      // Also check STT permission
      bool hasSTTPermission = await _speechToText.hasPermission;

      if (hasMicPermission && hasSTTPermission) {
        final dir = await getTemporaryDirectory();
        final path = p.join(
          dir.path,
          'audio_${DateTime.now().millisecondsSinceEpoch}.m4a',
        );

        // NOTE: On some Android devices, simultaneous recording (record package) 
        // and STT (speech_to_text package) can conflict due to microphone focus.
        // We prioritize starting STT first as it is more sensitive to focus.
        
        await _speechToText.listen(
          onResult: _onSpeechResult,
          localeId: 'en_IN',
          listenOptions: SpeechListenOptions(
            cancelOnError: false,
            partialResults: true,
            listenMode: ListenMode.dictation,
          ),
        );

        // Small delay to let STT settle focus before starting file recorder
        await Future.delayed(const Duration(milliseconds: 300));

        const config = RecordConfig(
          encoder: AudioEncoder.aacLc, // Use widely compatible encoder
          bitRate: 128000,
          sampleRate: 44100,
        );

        await _audioRecorder.start(config, path: path);

        setState(() {
          _isRecording = true;
          _recordDuration = 0;
          _lastWords = '';
          _audioPath = null;
        });
        _startTimer();
      } else {
        debugPrint('Microphone or STT permission denied');
      }
    } catch (e) {
      debugPrint('Error starting recording: $e');
      _stop(); // Clean up on error
    }
  }

  Future<void> _stop() async {
    _timer?.cancel();
    
    String? path;
    try {
      if (await _audioRecorder.isRecording()) {
        path = await _audioRecorder.stop();
      }
    } catch (e) {
      debugPrint('Error stopping audio recorder: $e');
    }

    try {
      await _speechToText.stop();
    } catch (e) {
      debugPrint('Error stopping STT: $e');
    }

    setState(() {
      _isRecording = false;
      _audioPath = path;
    });

    widget.onRecordingComplete(path, _lastWords);
  }

  void _onSpeechResult(SpeechRecognitionResult result) {
    if (mounted) {
      setState(() {
        _lastWords = result.recognizedWords;
      });
      // We send updates only when it's final or the recording stops to populate description
      if (result.finalResult || !_isRecording) {
        widget.onRecordingComplete(_audioPath, _lastWords);
      }
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (Timer t) {
      if (mounted) setState(() => _recordDuration++);
    });
  }

  String _formatNumber(int number) {
    return number.toString().padLeft(2, '0');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final minutes = _formatNumber(_recordDuration ~/ 60);
    final seconds = _formatNumber(_recordDuration % 60);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.dividerColor),
        boxShadow: [
          if (_isRecording)
            BoxShadow(
              color: Colors.red.withValues(alpha: 0.1),
              blurRadius: 10,
              spreadRadius: 2,
            )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              IconButton.filledTonal(
                onPressed: _isRecording ? _stop : _start,
                icon: Icon(_isRecording ? Icons.stop : Icons.mic),
                color: _isRecording ? Colors.red : theme.colorScheme.primary,
                style: IconButton.styleFrom(
                  padding: const EdgeInsets.all(12),
                ),
              ),
              if (!_isRecording) ...[
                const SizedBox(width: 8),
                IconButton.filledTonal(
                  onPressed: _pickAudioFile,
                  icon: const Icon(Icons.upload_file_outlined),
                  color: theme.colorScheme.secondary,
                  style: IconButton.styleFrom(
                    padding: const EdgeInsets.all(12),
                  ),
                ),
              ],
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _isRecording ? 'Listening & Recording...' : (_audioPath != null ? 'Audio file attached' : 'Speak or upload complaint audio'),
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: _isRecording ? Colors.red : null,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    if (_isRecording)
                      Text(
                        '$minutes:$seconds',
                        style: TextStyle(fontSize: 12, color: theme.hintColor),
                      )
                    else if (_audioPath != null)
                      Flexible(
                        child: Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 4,
                          children: [
                            const Icon(Icons.check_circle, size: 14, color: Colors.green),
                            Text(
                              'Audio attached',
                              style: TextStyle(fontSize: 12, color: theme.hintColor),
                            ),
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  _audioPath = null;
                                  _recordDuration = 0;
                                  _lastWords = '';
                                });
                                widget.onRecordingComplete(null, null);
                              },
                              child: const Text(
                                'Remove',
                                style: TextStyle(fontSize: 12, color: Colors.red, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      Text(
                        'On-device processing',
                        style: TextStyle(fontSize: 11, color: theme.hintColor),
                      ),
                  ],
                ),
              ),
            ],
          ),
          if (_isRecording && _lastWords.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 12.0),
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(8),
                ),
                width: double.infinity,
                child: Text(
                  '“$_lastWords”',
                  style: TextStyle(
                    fontStyle: FontStyle.italic,
                    fontSize: 13,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
