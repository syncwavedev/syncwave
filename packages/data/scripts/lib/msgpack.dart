import 'dart:typed_data';

import 'package:message_pack_dart/message_pack_dart.dart' as m2;

import 'message.dart';

Uint8List encodeMessage(Message message) {
  return m2.serialize(message.toJson());
}

Map<String, dynamic> dynamicMapToString(Map<dynamic, dynamic> data) {
  List<dynamic> convertList(List<dynamic> src) {
    List<dynamic> dst = [];
    for (int i = 0; i < src.length; ++i) {
      if (src[i] is Map<dynamic, dynamic>) {
        dst.add(dynamicMapToString(src[i] as Map<dynamic, dynamic>));
      } else if (src[i] is List<dynamic>) {
        dst.add(convertList(src[i] as List<dynamic>));
      } else {
        dst.add(src[i]);
      }
    }
    return dst;
  }

  Map<String, dynamic> result = {};
  for (dynamic key in data.keys) {
    if (data[key] is Map<dynamic, dynamic>) {
      result[key.toString()] =
          dynamicMapToString(data[key] as Map<dynamic, dynamic>);
    } else if (data[key] is List<dynamic>) {
      result[key.toString()] = convertList(data[key] as List<dynamic>);
    } else {
      result[key.toString()] = data[key];
    }
  }
  return result;
}

Message decodeMessage(Uint8List bytes) {
  var json = m2.deserialize(bytes);
  return Message.fromJson(dynamicMapToString(json as Map<dynamic, dynamic>));
}
