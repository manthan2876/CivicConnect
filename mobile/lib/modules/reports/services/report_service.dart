import 'dart:convert';
import 'package:civic_connect_mobile/config/api_client.dart' as http;
import '../../../config/api_config.dart';

class ReportService {
  Future<Map<String, dynamic>> getReportById(String reportId) async {
    final response = await http.get(
      Uri.parse('${ApiConfig.reportsUrl}/$reportId'),
      headers: ApiConfig.getHeaders(),
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load report detail');
    }
  }

  Future<void> upvoteReport(String reportId, String identifier) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.reportsUrl}/$reportId/upvote'),
      headers: ApiConfig.getHeaders(),
      body: json.encode({'identifier': identifier}),
    );

    if (response.statusCode != 200) {
      final error = json.decode(response.body)['error'] ?? 'Failed to upvote';
      throw Exception(error);
    }
  }

  Future<void> confirmResolution(String reportId, int rating) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.reportsUrl}/$reportId/confirm-resolution'),
      headers: ApiConfig.getHeaders(),
      body: json.encode({'feedback_rating': rating}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to confirm resolution');
    }
  }

  Future<void> citizenConfirm(String reportId, int rating) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.reportsUrl}/$reportId/citizen-confirm'),
      headers: ApiConfig.getHeaders(),
      body: json.encode({'feedback_rating': rating}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to verify resolution');
    }
  }

  Future<void> citizenDispute(String reportId, String reason) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.reportsUrl}/$reportId/citizen-dispute'),
      headers: ApiConfig.getHeaders(),
      body: json.encode({'reason': reason}),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to dispute resolution');
    }
  }

  Future<void> proposeResolution(String reportId, List<int> imageBytes, String filename) async {
    var request = http.MultipartRequest(
      'POST',
      Uri.parse('${ApiConfig.reportsUrl}/$reportId/propose-resolution'),
    );
    
    // Combine standard headers with MultiPart requirements
    final authHeaders = ApiConfig.getHeaders(includeContentType: false);
    request.headers.addAll(authHeaders);

    request.files.add(
      http.MultipartFile.fromBytes(
        'image',
        imageBytes,
        filename: filename,
      ),
    );

    var response = await request.send();

    if (response.statusCode != 200) {
      final resStr = await response.stream.bytesToString();
      throw Exception('Failed to propose resolution: $resStr');
    }
  }
}
