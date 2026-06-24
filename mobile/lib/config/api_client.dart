import 'dart:convert';
import 'package:http/http.dart' as http;
export 'package:http/http.dart' hide get, post, patch, put, delete;
import 'api_config.dart';

Future<http.Response> _requestWithFallback(
  String method,
  Uri url, {
  Map<String, String>? headers,
  Object? body,
  Encoding? encoding,
}) async {
  Future<http.Response> execute(Uri requestUrl) {
    switch (method) {
      case 'GET':
        return http.get(requestUrl, headers: headers);
      case 'POST':
        return http.post(requestUrl, headers: headers, body: body, encoding: encoding);
      case 'PATCH':
        return http.patch(requestUrl, headers: headers, body: body, encoding: encoding);
      case 'DELETE':
        return http.delete(requestUrl, headers: headers, body: body, encoding: encoding);
      default:
        throw ArgumentError('Unsupported method: $method');
    }
  }

  // If already fallback or not starting with primary URL, run directly
  if (ApiConfig.useLocalFallback || !url.toString().startsWith(ApiConfig.primaryBaseUrl)) {
    return await execute(url);
  }

  try {
    final response = await execute(url);
    if (response.statusCode >= 502 && response.statusCode <= 504) {
      throw http.ClientException("Server proxy error: ${response.statusCode}", url);
    }
    return response;
  } catch (e) {
    print("[API Fallback] Request to $url failed: $e. Shifting to local fallback.");
    ApiConfig.useLocalFallback = true;
    final fallbackUrl = Uri.parse(url.toString().replaceFirst(ApiConfig.primaryBaseUrl, ApiConfig.localBaseUrl));
    print("[API Fallback] Retrying request with local URL: $fallbackUrl");
    try {
      return await execute(fallbackUrl);
    } catch (fallbackErr) {
      print("[API Fallback] Local fallback also failed: $fallbackErr");
      rethrow;
    }
  }
}

Future<http.Response> get(Uri url, {Map<String, String>? headers}) =>
    _requestWithFallback('GET', url, headers: headers);

Future<http.Response> post(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) =>
    _requestWithFallback('POST', url, headers: headers, body: body, encoding: encoding);

Future<http.Response> patch(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) =>
    _requestWithFallback('PATCH', url, headers: headers, body: body, encoding: encoding);

Future<http.Response> delete(Uri url, {Map<String, String>? headers, Object? body, Encoding? encoding}) =>
    _requestWithFallback('DELETE', url, headers: headers, body: body, encoding: encoding);
