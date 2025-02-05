// To parse this JSON data, do
//
//     final streamPutRequest = streamPutRequestFromJson(jsonString);
//     final streamPutResponse = streamPutResponseFromJson(jsonString);
//     final getStreamRequest = getStreamRequestFromJson(jsonString);
//     final getStreamItem = getStreamItemFromJson(jsonString);
//     final debugRequest = debugRequestFromJson(jsonString);
//     final debugResponse = debugResponseFromJson(jsonString);
//     final getMeRequest = getMeRequestFromJson(jsonString);
//     final getMeValue = getMeValueFromJson(jsonString);
//     final getMeUpdate = getMeUpdateFromJson(jsonString);
//     final sendSignInEmailRequest = sendSignInEmailRequestFromJson(jsonString);
//     final sendSignInEmailResponse = sendSignInEmailResponseFromJson(jsonString);
//     final createBoardRequest = createBoardRequestFromJson(jsonString);
//     final createBoardResponse = createBoardResponseFromJson(jsonString);
//     final verifySignInCodeRequest = verifySignInCodeRequestFromJson(jsonString);
//     final verifySignInCodeResponse = verifySignInCodeResponseFromJson(jsonString);
//     final getDbTreeRequest = getDbTreeRequestFromJson(jsonString);
//     final getDbTreeResponse = getDbTreeResponseFromJson(jsonString);
//     final getDbItemRequest = getDbItemRequestFromJson(jsonString);
//     final getDbItemResponse = getDbItemResponseFromJson(jsonString);
//     final truncateDbRequest = truncateDbRequestFromJson(jsonString);
//     final truncateDbResponse = truncateDbResponseFromJson(jsonString);
//     final deleteDbItemRequest = deleteDbItemRequestFromJson(jsonString);
//     final deleteDbItemResponse = deleteDbItemResponseFromJson(jsonString);
//     final getMyBoardsRequest = getMyBoardsRequestFromJson(jsonString);
//     final getMyBoardsValue = getMyBoardsValueFromJson(jsonString);
//     final getMyBoardsUpdate = getMyBoardsUpdateFromJson(jsonString);
//     final getObserveRequest = getObserveRequestFromJson(jsonString);
//     final getObserveValue = getObserveValueFromJson(jsonString);
//     final getObserveUpdate = getObserveUpdateFromJson(jsonString);
//     final echoRequest = echoRequestFromJson(jsonString);
//     final echoResponse = echoResponseFromJson(jsonString);
//     final getBoardRequest = getBoardRequestFromJson(jsonString);
//     final getBoardValue = getBoardValueFromJson(jsonString);
//     final getBoardUpdate = getBoardUpdateFromJson(jsonString);

import 'dart:convert';

StreamPutRequest streamPutRequestFromJson(String str) => StreamPutRequest.fromJson(json.decode(str));

String streamPutRequestToJson(StreamPutRequest data) => json.encode(data.toJson());

StreamPutResponse streamPutResponseFromJson(String str) => StreamPutResponse.fromJson(json.decode(str));

String streamPutResponseToJson(StreamPutResponse data) => json.encode(data.toJson());

GetStreamRequest getStreamRequestFromJson(String str) => GetStreamRequest.fromJson(json.decode(str));

String getStreamRequestToJson(GetStreamRequest data) => json.encode(data.toJson());

GetStreamItem getStreamItemFromJson(String str) => GetStreamItem.fromJson(json.decode(str));

String getStreamItemToJson(GetStreamItem data) => json.encode(data.toJson());

DebugRequest debugRequestFromJson(String str) => DebugRequest.fromJson(json.decode(str));

String debugRequestToJson(DebugRequest data) => json.encode(data.toJson());

DebugResponse debugResponseFromJson(String str) => DebugResponse.fromJson(json.decode(str));

String debugResponseToJson(DebugResponse data) => json.encode(data.toJson());

GetMeRequest getMeRequestFromJson(String str) => GetMeRequest.fromJson(json.decode(str));

String getMeRequestToJson(GetMeRequest data) => json.encode(data.toJson());

GetMeValue getMeValueFromJson(String str) => GetMeValue.fromJson(json.decode(str));

String getMeValueToJson(GetMeValue data) => json.encode(data.toJson());

GetMeUpdate getMeUpdateFromJson(String str) => GetMeUpdate.fromJson(json.decode(str));

String getMeUpdateToJson(GetMeUpdate data) => json.encode(data.toJson());

SendSignInEmailRequest sendSignInEmailRequestFromJson(String str) => SendSignInEmailRequest.fromJson(json.decode(str));

String sendSignInEmailRequestToJson(SendSignInEmailRequest data) => json.encode(data.toJson());

SendSignInEmailResponse sendSignInEmailResponseFromJson(String str) => SendSignInEmailResponse.fromJson(json.decode(str));

String sendSignInEmailResponseToJson(SendSignInEmailResponse data) => json.encode(data.toJson());

CreateBoardRequest createBoardRequestFromJson(String str) => CreateBoardRequest.fromJson(json.decode(str));

String createBoardRequestToJson(CreateBoardRequest data) => json.encode(data.toJson());

CreateBoardResponse createBoardResponseFromJson(String str) => CreateBoardResponse.fromJson(json.decode(str));

String createBoardResponseToJson(CreateBoardResponse data) => json.encode(data.toJson());

VerifySignInCodeRequest verifySignInCodeRequestFromJson(String str) => VerifySignInCodeRequest.fromJson(json.decode(str));

String verifySignInCodeRequestToJson(VerifySignInCodeRequest data) => json.encode(data.toJson());

VerifySignInCodeResponse verifySignInCodeResponseFromJson(String str) => VerifySignInCodeResponse.fromJson(json.decode(str));

String verifySignInCodeResponseToJson(VerifySignInCodeResponse data) => json.encode(data.toJson());

GetDbTreeRequest getDbTreeRequestFromJson(String str) => GetDbTreeRequest.fromJson(json.decode(str));

String getDbTreeRequestToJson(GetDbTreeRequest data) => json.encode(data.toJson());

GetDbTreeResponse getDbTreeResponseFromJson(String str) => GetDbTreeResponse.fromJson(json.decode(str));

String getDbTreeResponseToJson(GetDbTreeResponse data) => json.encode(data.toJson());

GetDbItemRequest getDbItemRequestFromJson(String str) => GetDbItemRequest.fromJson(json.decode(str));

String getDbItemRequestToJson(GetDbItemRequest data) => json.encode(data.toJson());

GetDbItemResponse getDbItemResponseFromJson(String str) => GetDbItemResponse.fromJson(json.decode(str));

String getDbItemResponseToJson(GetDbItemResponse data) => json.encode(data.toJson());

TruncateDbRequest truncateDbRequestFromJson(String str) => TruncateDbRequest.fromJson(json.decode(str));

String truncateDbRequestToJson(TruncateDbRequest data) => json.encode(data.toJson());

dynamic truncateDbResponseFromJson(String str) => json.decode(str);

String truncateDbResponseToJson(dynamic data) => json.encode(data);

DeleteDbItemRequest deleteDbItemRequestFromJson(String str) => DeleteDbItemRequest.fromJson(json.decode(str));

String deleteDbItemRequestToJson(DeleteDbItemRequest data) => json.encode(data.toJson());

dynamic deleteDbItemResponseFromJson(String str) => json.decode(str);

String deleteDbItemResponseToJson(dynamic data) => json.encode(data);

GetMyBoardsRequest getMyBoardsRequestFromJson(String str) => GetMyBoardsRequest.fromJson(json.decode(str));

String getMyBoardsRequestToJson(GetMyBoardsRequest data) => json.encode(data.toJson());

List<GetMyBoardsValue> getMyBoardsValueFromJson(String str) => List<GetMyBoardsValue>.from(json.decode(str).map((x) => GetMyBoardsValue.fromJson(x)));

String getMyBoardsValueToJson(List<GetMyBoardsValue> data) => json.encode(List<dynamic>.from(data.map((x) => x.toJson())));

List<GetMyBoardsUpdate> getMyBoardsUpdateFromJson(String str) => List<GetMyBoardsUpdate>.from(json.decode(str).map((x) => GetMyBoardsUpdate.fromJson(x)));

String getMyBoardsUpdateToJson(List<GetMyBoardsUpdate> data) => json.encode(List<dynamic>.from(data.map((x) => x.toJson())));

GetObserveRequest getObserveRequestFromJson(String str) => GetObserveRequest.fromJson(json.decode(str));

String getObserveRequestToJson(GetObserveRequest data) => json.encode(data.toJson());

GetObserveValue getObserveValueFromJson(String str) => GetObserveValue.fromJson(json.decode(str));

String getObserveValueToJson(GetObserveValue data) => json.encode(data.toJson());

GetObserveUpdate getObserveUpdateFromJson(String str) => GetObserveUpdate.fromJson(json.decode(str));

String getObserveUpdateToJson(GetObserveUpdate data) => json.encode(data.toJson());

EchoRequest echoRequestFromJson(String str) => EchoRequest.fromJson(json.decode(str));

String echoRequestToJson(EchoRequest data) => json.encode(data.toJson());

EchoResponse echoResponseFromJson(String str) => EchoResponse.fromJson(json.decode(str));

String echoResponseToJson(EchoResponse data) => json.encode(data.toJson());

GetBoardRequest getBoardRequestFromJson(String str) => GetBoardRequest.fromJson(json.decode(str));

String getBoardRequestToJson(GetBoardRequest data) => json.encode(data.toJson());

GetBoardValue getBoardValueFromJson(String str) => GetBoardValue.fromJson(json.decode(str));

String getBoardValueToJson(GetBoardValue data) => json.encode(data.toJson());

GetBoardUpdate getBoardUpdateFromJson(String str) => GetBoardUpdate.fromJson(json.decode(str));

String getBoardUpdateToJson(GetBoardUpdate data) => json.encode(data.toJson());

class StreamPutRequest {
    String topic;
    String value;

    StreamPutRequest({
        required this.topic,
        required this.value,
    });

    factory StreamPutRequest.fromJson(Map<String, dynamic> json) => StreamPutRequest(
        topic: json["topic"],
        value: json["value"],
    );

    Map<String, dynamic> toJson() => {
        "topic": topic,
        "value": value,
    };
}

class StreamPutResponse {
    StreamPutResponse();

    factory StreamPutResponse.fromJson(Map<String, dynamic> json) => StreamPutResponse(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetStreamRequest {
    String topic;

    GetStreamRequest({
        required this.topic,
    });

    factory GetStreamRequest.fromJson(Map<String, dynamic> json) => GetStreamRequest(
        topic: json["topic"],
    );

    Map<String, dynamic> toJson() => {
        "topic": topic,
    };
}

class GetStreamItem {
    double index;
    String value;

    GetStreamItem({
        required this.index,
        required this.value,
    });

    factory GetStreamItem.fromJson(Map<String, dynamic> json) => GetStreamItem(
        index: json["index"]?.toDouble(),
        value: json["value"],
    );

    Map<String, dynamic> toJson() => {
        "index": index,
        "value": value,
    };
}

class DebugRequest {
    DebugRequest();

    factory DebugRequest.fromJson(Map<String, dynamic> json) => DebugRequest(
    );

    Map<String, dynamic> toJson() => {
    };
}

class DebugResponse {
    DebugResponse();

    factory DebugResponse.fromJson(Map<String, dynamic> json) => DebugResponse(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetMeRequest {
    GetMeRequest();

    factory GetMeRequest.fromJson(Map<String, dynamic> json) => GetMeRequest(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetMeValue {
    GetMeValueIdentity identity;
    GetMeValueUser user;

    GetMeValue({
        required this.identity,
        required this.user,
    });

    factory GetMeValue.fromJson(Map<String, dynamic> json) => GetMeValue(
        identity: GetMeValueIdentity.fromJson(json["identity"]),
        user: GetMeValueUser.fromJson(json["user"]),
    );

    Map<String, dynamic> toJson() => {
        "identity": identity.toJson(),
        "user": user.toJson(),
    };
}

class GetMeValueIdentity {
    List<dynamic> authActivityLog;
    dynamic createdAt;
    String email;
    dynamic id;
    dynamic updatedAt;
    dynamic userId;
    
    ///VerificationCode
    PurpleVerificationCode verificationCode;

    GetMeValueIdentity({
        required this.authActivityLog,
        required this.createdAt,
        required this.email,
        required this.id,
        required this.updatedAt,
        required this.userId,
        required this.verificationCode,
    });

    factory GetMeValueIdentity.fromJson(Map<String, dynamic> json) => GetMeValueIdentity(
        authActivityLog: List<dynamic>.from(json["authActivityLog"].map((x) => x)),
        createdAt: json["createdAt"],
        email: json["email"],
        id: json["id"],
        updatedAt: json["updatedAt"],
        userId: json["userId"],
        verificationCode: PurpleVerificationCode.fromJson(json["verificationCode"]),
    );

    Map<String, dynamic> toJson() => {
        "authActivityLog": List<dynamic>.from(authActivityLog.map((x) => x)),
        "createdAt": createdAt,
        "email": email,
        "id": id,
        "updatedAt": updatedAt,
        "userId": userId,
        "verificationCode": verificationCode.toJson(),
    };
}


///VerificationCode
class PurpleVerificationCode {
    String code;
    dynamic expires;

    PurpleVerificationCode({
        required this.code,
        required this.expires,
    });

    factory PurpleVerificationCode.fromJson(Map<String, dynamic> json) => PurpleVerificationCode(
        code: json["code"],
        expires: json["expires"],
    );

    Map<String, dynamic> toJson() => {
        "code": code,
        "expires": expires,
    };
}

class GetMeValueUser {
    dynamic createdAt;
    dynamic id;
    dynamic updatedAt;

    GetMeValueUser({
        required this.createdAt,
        required this.id,
        required this.updatedAt,
    });

    factory GetMeValueUser.fromJson(Map<String, dynamic> json) => GetMeValueUser(
        createdAt: json["createdAt"],
        id: json["id"],
        updatedAt: json["updatedAt"],
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "id": id,
        "updatedAt": updatedAt,
    };
}

class GetMeUpdate {
    GetMeUpdateIdentity identity;
    GetMeUpdateUser user;

    GetMeUpdate({
        required this.identity,
        required this.user,
    });

    factory GetMeUpdate.fromJson(Map<String, dynamic> json) => GetMeUpdate(
        identity: GetMeUpdateIdentity.fromJson(json["identity"]),
        user: GetMeUpdateUser.fromJson(json["user"]),
    );

    Map<String, dynamic> toJson() => {
        "identity": identity.toJson(),
        "user": user.toJson(),
    };
}

class GetMeUpdateIdentity {
    List<dynamic> authActivityLog;
    dynamic createdAt;
    String email;
    dynamic id;
    dynamic updatedAt;
    dynamic userId;
    
    ///VerificationCode
    FluffyVerificationCode verificationCode;

    GetMeUpdateIdentity({
        required this.authActivityLog,
        required this.createdAt,
        required this.email,
        required this.id,
        required this.updatedAt,
        required this.userId,
        required this.verificationCode,
    });

    factory GetMeUpdateIdentity.fromJson(Map<String, dynamic> json) => GetMeUpdateIdentity(
        authActivityLog: List<dynamic>.from(json["authActivityLog"].map((x) => x)),
        createdAt: json["createdAt"],
        email: json["email"],
        id: json["id"],
        updatedAt: json["updatedAt"],
        userId: json["userId"],
        verificationCode: FluffyVerificationCode.fromJson(json["verificationCode"]),
    );

    Map<String, dynamic> toJson() => {
        "authActivityLog": List<dynamic>.from(authActivityLog.map((x) => x)),
        "createdAt": createdAt,
        "email": email,
        "id": id,
        "updatedAt": updatedAt,
        "userId": userId,
        "verificationCode": verificationCode.toJson(),
    };
}


///VerificationCode
class FluffyVerificationCode {
    String code;
    dynamic expires;

    FluffyVerificationCode({
        required this.code,
        required this.expires,
    });

    factory FluffyVerificationCode.fromJson(Map<String, dynamic> json) => FluffyVerificationCode(
        code: json["code"],
        expires: json["expires"],
    );

    Map<String, dynamic> toJson() => {
        "code": code,
        "expires": expires,
    };
}

class GetMeUpdateUser {
    dynamic createdAt;
    dynamic id;
    dynamic updatedAt;

    GetMeUpdateUser({
        required this.createdAt,
        required this.id,
        required this.updatedAt,
    });

    factory GetMeUpdateUser.fromJson(Map<String, dynamic> json) => GetMeUpdateUser(
        createdAt: json["createdAt"],
        id: json["id"],
        updatedAt: json["updatedAt"],
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "id": id,
        "updatedAt": updatedAt,
    };
}

class SendSignInEmailRequest {
    String email;

    SendSignInEmailRequest({
        required this.email,
    });

    factory SendSignInEmailRequest.fromJson(Map<String, dynamic> json) => SendSignInEmailRequest(
        email: json["email"],
    );

    Map<String, dynamic> toJson() => {
        "email": email,
    };
}

class SendSignInEmailResponse {
    SendSignInEmailResponseType type;

    SendSignInEmailResponse({
        required this.type,
    });

    factory SendSignInEmailResponse.fromJson(Map<String, dynamic> json) => SendSignInEmailResponse(
        type: sendSignInEmailResponseTypeValues.map[json["type"]]!,
    );

    Map<String, dynamic> toJson() => {
        "type": sendSignInEmailResponseTypeValues.reverse[type],
    };
}

enum SendSignInEmailResponseType {
    COOLDOWN,
    SUCCESS
}

final sendSignInEmailResponseTypeValues = EnumValues({
    "cooldown": SendSignInEmailResponseType.COOLDOWN,
    "success": SendSignInEmailResponseType.SUCCESS
});

class CreateBoardRequest {
    dynamic boardId;
    String key;
    String name;

    CreateBoardRequest({
        required this.boardId,
        required this.key,
        required this.name,
    });

    factory CreateBoardRequest.fromJson(Map<String, dynamic> json) => CreateBoardRequest(
        boardId: json["boardId"],
        key: json["key"],
        name: json["name"],
    );

    Map<String, dynamic> toJson() => {
        "boardId": boardId,
        "key": key,
        "name": name,
    };
}

class CreateBoardResponse {
    dynamic createdAt;
    bool deleted;
    dynamic id;
    String key;
    String name;
    dynamic ownerId;
    dynamic updatedAt;

    CreateBoardResponse({
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.ownerId,
        required this.updatedAt,
    });

    factory CreateBoardResponse.fromJson(Map<String, dynamic> json) => CreateBoardResponse(
        createdAt: json["createdAt"],
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        ownerId: json["ownerId"],
        updatedAt: json["updatedAt"],
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "ownerId": ownerId,
        "updatedAt": updatedAt,
    };
}

class VerifySignInCodeRequest {
    String code;
    String email;

    VerifySignInCodeRequest({
        required this.code,
        required this.email,
    });

    factory VerifySignInCodeRequest.fromJson(Map<String, dynamic> json) => VerifySignInCodeRequest(
        code: json["code"],
        email: json["email"],
    );

    Map<String, dynamic> toJson() => {
        "code": code,
        "email": email,
    };
}

class VerifySignInCodeResponse {
    String? token;
    VerifySignInCodeResponseType type;

    VerifySignInCodeResponse({
        this.token,
        required this.type,
    });

    factory VerifySignInCodeResponse.fromJson(Map<String, dynamic> json) => VerifySignInCodeResponse(
        token: json["token"],
        type: verifySignInCodeResponseTypeValues.map[json["type"]]!,
    );

    Map<String, dynamic> toJson() => {
        "token": token,
        "type": verifySignInCodeResponseTypeValues.reverse[type],
    };
}

enum VerifySignInCodeResponseType {
    CODE_EXPIRED,
    COOLDOWN,
    INVALID_CODE,
    SUCCESS
}

final verifySignInCodeResponseTypeValues = EnumValues({
    "code_expired": VerifySignInCodeResponseType.CODE_EXPIRED,
    "cooldown": VerifySignInCodeResponseType.COOLDOWN,
    "invalid_code": VerifySignInCodeResponseType.INVALID_CODE,
    "success": VerifySignInCodeResponseType.SUCCESS
});

class GetDbTreeRequest {
    GetDbTreeRequest();

    factory GetDbTreeRequest.fromJson(Map<String, dynamic> json) => GetDbTreeRequest(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetDbTreeResponse {
    List<GetDbTreeRespons> childrenPreview;
    dynamic key;
    String name;
    ChildrenPreviewType type;

    GetDbTreeResponse({
        required this.childrenPreview,
        required this.key,
        required this.name,
        required this.type,
    });

    factory GetDbTreeResponse.fromJson(Map<String, dynamic> json) => GetDbTreeResponse(
        childrenPreview: List<GetDbTreeRespons>.from(json["childrenPreview"].map((x) => GetDbTreeRespons.fromJson(x))),
        key: json["key"],
        name: json["name"],
        type: childrenPreviewTypeValues.map[json["type"]]!,
    );

    Map<String, dynamic> toJson() => {
        "childrenPreview": List<dynamic>.from(childrenPreview.map((x) => x.toJson())),
        "key": key,
        "name": name,
        "type": childrenPreviewTypeValues.reverse[type],
    };
}

class GetDbTreeRespons {
    List<GetDbTreeRespons> childrenPreview;
    dynamic key;
    String name;
    ChildrenPreviewType type;

    GetDbTreeRespons({
        required this.childrenPreview,
        required this.key,
        required this.name,
        required this.type,
    });

    factory GetDbTreeRespons.fromJson(Map<String, dynamic> json) => GetDbTreeRespons(
        childrenPreview: List<GetDbTreeRespons>.from(json["childrenPreview"].map((x) => GetDbTreeRespons.fromJson(x))),
        key: json["key"],
        name: json["name"],
        type: childrenPreviewTypeValues.map[json["type"]]!,
    );

    Map<String, dynamic> toJson() => {
        "childrenPreview": List<dynamic>.from(childrenPreview.map((x) => x.toJson())),
        "key": key,
        "name": name,
        "type": childrenPreviewTypeValues.reverse[type],
    };
}

enum ChildrenPreviewType {
    AGGREGATE,
    DOC,
    REPO
}

final childrenPreviewTypeValues = EnumValues({
    "aggregate": ChildrenPreviewType.AGGREGATE,
    "doc": ChildrenPreviewType.DOC,
    "repo": ChildrenPreviewType.REPO
});

class GetDbItemRequest {
    List<dynamic> path;

    GetDbItemRequest({
        required this.path,
    });

    factory GetDbItemRequest.fromJson(Map<String, dynamic> json) => GetDbItemRequest(
        path: List<dynamic>.from(json["path"].map((x) => x)),
    );

    Map<String, dynamic> toJson() => {
        "path": List<dynamic>.from(path.map((x) => x)),
    };
}

class GetDbItemResponse {
    ChildrenPreviewType type;
    dynamic snapshot;

    GetDbItemResponse({
        required this.type,
        this.snapshot,
    });

    factory GetDbItemResponse.fromJson(Map<String, dynamic> json) => GetDbItemResponse(
        type: childrenPreviewTypeValues.map[json["type"]]!,
        snapshot: json["snapshot"],
    );

    Map<String, dynamic> toJson() => {
        "type": childrenPreviewTypeValues.reverse[type],
        "snapshot": snapshot,
    };
}

class TruncateDbRequest {
    TruncateDbRequest();

    factory TruncateDbRequest.fromJson(Map<String, dynamic> json) => TruncateDbRequest(
    );

    Map<String, dynamic> toJson() => {
    };
}

class DeleteDbItemRequest {
    List<dynamic> path;

    DeleteDbItemRequest({
        required this.path,
    });

    factory DeleteDbItemRequest.fromJson(Map<String, dynamic> json) => DeleteDbItemRequest(
        path: List<dynamic>.from(json["path"].map((x) => x)),
    );

    Map<String, dynamic> toJson() => {
        "path": List<dynamic>.from(path.map((x) => x)),
    };
}

class GetMyBoardsRequest {
    GetMyBoardsRequest();

    factory GetMyBoardsRequest.fromJson(Map<String, dynamic> json) => GetMyBoardsRequest(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetMyBoardsValue {
    dynamic createdAt;
    bool deleted;
    dynamic id;
    String key;
    String name;
    dynamic ownerId;
    dynamic updatedAt;

    GetMyBoardsValue({
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.ownerId,
        required this.updatedAt,
    });

    factory GetMyBoardsValue.fromJson(Map<String, dynamic> json) => GetMyBoardsValue(
        createdAt: json["createdAt"],
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        ownerId: json["ownerId"],
        updatedAt: json["updatedAt"],
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "ownerId": ownerId,
        "updatedAt": updatedAt,
    };
}

class GetMyBoardsUpdate {
    dynamic createdAt;
    bool deleted;
    dynamic id;
    String key;
    String name;
    dynamic ownerId;
    dynamic updatedAt;

    GetMyBoardsUpdate({
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.ownerId,
        required this.updatedAt,
    });

    factory GetMyBoardsUpdate.fromJson(Map<String, dynamic> json) => GetMyBoardsUpdate(
        createdAt: json["createdAt"],
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        ownerId: json["ownerId"],
        updatedAt: json["updatedAt"],
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "ownerId": ownerId,
        "updatedAt": updatedAt,
    };
}

class GetObserveRequest {
    String topic;

    GetObserveRequest({
        required this.topic,
    });

    factory GetObserveRequest.fromJson(Map<String, dynamic> json) => GetObserveRequest(
        topic: json["topic"],
    );

    Map<String, dynamic> toJson() => {
        "topic": topic,
    };
}

class GetObserveValue {
    double index;
    String value;

    GetObserveValue({
        required this.index,
        required this.value,
    });

    factory GetObserveValue.fromJson(Map<String, dynamic> json) => GetObserveValue(
        index: json["index"]?.toDouble(),
        value: json["value"],
    );

    Map<String, dynamic> toJson() => {
        "index": index,
        "value": value,
    };
}

class GetObserveUpdate {
    double index;
    String value;

    GetObserveUpdate({
        required this.index,
        required this.value,
    });

    factory GetObserveUpdate.fromJson(Map<String, dynamic> json) => GetObserveUpdate(
        index: json["index"]?.toDouble(),
        value: json["value"],
    );

    Map<String, dynamic> toJson() => {
        "index": index,
        "value": value,
    };
}

class EchoRequest {
    String msg;

    EchoRequest({
        required this.msg,
    });

    factory EchoRequest.fromJson(Map<String, dynamic> json) => EchoRequest(
        msg: json["msg"],
    );

    Map<String, dynamic> toJson() => {
        "msg": msg,
    };
}

class EchoResponse {
    String msg;

    EchoResponse({
        required this.msg,
    });

    factory EchoResponse.fromJson(Map<String, dynamic> json) => EchoResponse(
        msg: json["msg"],
    );

    Map<String, dynamic> toJson() => {
        "msg": msg,
    };
}

class GetBoardRequest {
    String key;

    GetBoardRequest({
        required this.key,
    });

    factory GetBoardRequest.fromJson(Map<String, dynamic> json) => GetBoardRequest(
        key: json["key"],
    );

    Map<String, dynamic> toJson() => {
        "key": key,
    };
}

class GetBoardValue {
    dynamic createdAt;
    bool deleted;
    dynamic id;
    String key;
    String name;
    dynamic ownerId;
    dynamic updatedAt;

    GetBoardValue({
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.ownerId,
        required this.updatedAt,
    });

    factory GetBoardValue.fromJson(Map<String, dynamic> json) => GetBoardValue(
        createdAt: json["createdAt"],
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        ownerId: json["ownerId"],
        updatedAt: json["updatedAt"],
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "ownerId": ownerId,
        "updatedAt": updatedAt,
    };
}

class GetBoardUpdate {
    dynamic createdAt;
    bool deleted;
    dynamic id;
    String key;
    String name;
    dynamic ownerId;
    dynamic updatedAt;

    GetBoardUpdate({
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.ownerId,
        required this.updatedAt,
    });

    factory GetBoardUpdate.fromJson(Map<String, dynamic> json) => GetBoardUpdate(
        createdAt: json["createdAt"],
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        ownerId: json["ownerId"],
        updatedAt: json["updatedAt"],
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "ownerId": ownerId,
        "updatedAt": updatedAt,
    };
}

class EnumValues<T> {
    Map<String, T> map;
    late Map<T, String> reverseMap;

    EnumValues(this.map);

    Map<T, String> get reverse {
            reverseMap = map.map((k, v) => MapEntry(v, k));
            return reverseMap;
    }
}
