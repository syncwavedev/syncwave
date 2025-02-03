import 'dart:typed_data';

import 'package:message_pack_dart/message_pack_dart.dart' as m2;

import 'message.dart';

Uint8List encodeMessage(Message message) {
  return m2.serialize(message.toJson());
}

Map<String, dynamic> dynamicMapToString(Map<dynamic, dynamic> data) {
  List<dynamic> _convertList(List<dynamic> src) {
    List<dynamic> dst = [];
    for (int i = 0; i < src.length; ++i) {
      if (src[i] is Map<dynamic, dynamic>) {
        dst.add(dynamicMapToString(src[i]));
      } else if (src[i] is List<dynamic>) {
        dst.add(_convertList(src[i]));
      } else {
        dst.add(src[i]);
      }
    }
    return dst;
  }

  Map<String, dynamic> result = {};
  for (dynamic key in data.keys) {
    if (data[key] is Map<dynamic, dynamic>) {
      result[key.toString()] = dynamicMapToString(data[key]);
    } else if (data[key] is List<dynamic>) {
      result[key.toString()] = _convertList(data[key]);
    } else {
      result[key.toString()] = data[key];
    }
  }
  return result;
}

Message decodeMessage(Uint8List bytes) {
  var json = m2.deserialize(bytes);
  return Message.fromJson(dynamicMapToString(json));
}
