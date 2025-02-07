// To parse this JSON data, do
//
//     final streamPutReq = streamPutReqFromJson(jsonString);
//     final streamPutRes = streamPutResFromJson(jsonString);
//     final getStreamReq = getStreamReqFromJson(jsonString);
//     final getStreamItem = getStreamItemFromJson(jsonString);
//     final debugReq = debugReqFromJson(jsonString);
//     final debugRes = debugResFromJson(jsonString);
//     final getMeReq = getMeReqFromJson(jsonString);
//     final getMeValue = getMeValueFromJson(jsonString);
//     final getMeUpdate = getMeUpdateFromJson(jsonString);
//     final sendSignInEmailReq = sendSignInEmailReqFromJson(jsonString);
//     final sendSignInEmailRes = sendSignInEmailResFromJson(jsonString);
//     final createBoardReq = createBoardReqFromJson(jsonString);
//     final createBoardRes = createBoardResFromJson(jsonString);
//     final verifySignInCodeReq = verifySignInCodeReqFromJson(jsonString);
//     final verifySignInCodeRes = verifySignInCodeResFromJson(jsonString);
//     final getDbTreeReq = getDbTreeReqFromJson(jsonString);
//     final getDbTreeRes = getDbTreeResFromJson(jsonString);
//     final getDbItemReq = getDbItemReqFromJson(jsonString);
//     final getDbItemRes = getDbItemResFromJson(jsonString);
//     final truncateDbReq = truncateDbReqFromJson(jsonString);
//     final truncateDbRes = truncateDbResFromJson(jsonString);
//     final deleteDbItemReq = deleteDbItemReqFromJson(jsonString);
//     final deleteDbItemRes = deleteDbItemResFromJson(jsonString);
//     final getMyBoardsReq = getMyBoardsReqFromJson(jsonString);
//     final getMyBoardsValue = getMyBoardsValueFromJson(jsonString);
//     final getMyBoardsUpdate = getMyBoardsUpdateFromJson(jsonString);
//     final getObserveReq = getObserveReqFromJson(jsonString);
//     final getObserveValue = getObserveValueFromJson(jsonString);
//     final getObserveUpdate = getObserveUpdateFromJson(jsonString);
//     final echoReq = echoReqFromJson(jsonString);
//     final echoRes = echoResFromJson(jsonString);
//     final getBoardReq = getBoardReqFromJson(jsonString);
//     final getBoardValue = getBoardValueFromJson(jsonString);
//     final getBoardUpdate = getBoardUpdateFromJson(jsonString);
//     final createCategoryReq = createCategoryReqFromJson(jsonString);
//     final createCategoryRes = createCategoryResFromJson(jsonString);
//     final createTaskReq = createTaskReqFromJson(jsonString);
//     final createTaskRes = createTaskResFromJson(jsonString);

import 'dart:convert';

StreamPutReq streamPutReqFromJson(String str) => StreamPutReq.fromJson(json.decode(str));

String streamPutReqToJson(StreamPutReq data) => json.encode(data.toJson());

StreamPutRes streamPutResFromJson(String str) => StreamPutRes.fromJson(json.decode(str));

String streamPutResToJson(StreamPutRes data) => json.encode(data.toJson());

GetStreamReq getStreamReqFromJson(String str) => GetStreamReq.fromJson(json.decode(str));

String getStreamReqToJson(GetStreamReq data) => json.encode(data.toJson());

GetStreamItem getStreamItemFromJson(String str) => GetStreamItem.fromJson(json.decode(str));

String getStreamItemToJson(GetStreamItem data) => json.encode(data.toJson());

DebugReq debugReqFromJson(String str) => DebugReq.fromJson(json.decode(str));

String debugReqToJson(DebugReq data) => json.encode(data.toJson());

DebugRes debugResFromJson(String str) => DebugRes.fromJson(json.decode(str));

String debugResToJson(DebugRes data) => json.encode(data.toJson());

GetMeReq getMeReqFromJson(String str) => GetMeReq.fromJson(json.decode(str));

String getMeReqToJson(GetMeReq data) => json.encode(data.toJson());

GetMeValue getMeValueFromJson(String str) => GetMeValue.fromJson(json.decode(str));

String getMeValueToJson(GetMeValue data) => json.encode(data.toJson());

GetMeUpdate getMeUpdateFromJson(String str) => GetMeUpdate.fromJson(json.decode(str));

String getMeUpdateToJson(GetMeUpdate data) => json.encode(data.toJson());

SendSignInEmailReq sendSignInEmailReqFromJson(String str) => SendSignInEmailReq.fromJson(json.decode(str));

String sendSignInEmailReqToJson(SendSignInEmailReq data) => json.encode(data.toJson());

SendSignInEmailRes sendSignInEmailResFromJson(String str) => SendSignInEmailRes.fromJson(json.decode(str));

String sendSignInEmailResToJson(SendSignInEmailRes data) => json.encode(data.toJson());

CreateBoardReq createBoardReqFromJson(String str) => CreateBoardReq.fromJson(json.decode(str));

String createBoardReqToJson(CreateBoardReq data) => json.encode(data.toJson());

CreateBoardRes createBoardResFromJson(String str) => CreateBoardRes.fromJson(json.decode(str));

String createBoardResToJson(CreateBoardRes data) => json.encode(data.toJson());

VerifySignInCodeReq verifySignInCodeReqFromJson(String str) => VerifySignInCodeReq.fromJson(json.decode(str));

String verifySignInCodeReqToJson(VerifySignInCodeReq data) => json.encode(data.toJson());

VerifySignInCodeRes verifySignInCodeResFromJson(String str) => VerifySignInCodeRes.fromJson(json.decode(str));

String verifySignInCodeResToJson(VerifySignInCodeRes data) => json.encode(data.toJson());

GetDbTreeReq getDbTreeReqFromJson(String str) => GetDbTreeReq.fromJson(json.decode(str));

String getDbTreeReqToJson(GetDbTreeReq data) => json.encode(data.toJson());

GetDbTreeRes getDbTreeResFromJson(String str) => GetDbTreeRes.fromJson(json.decode(str));

String getDbTreeResToJson(GetDbTreeRes data) => json.encode(data.toJson());

GetDbItemReq getDbItemReqFromJson(String str) => GetDbItemReq.fromJson(json.decode(str));

String getDbItemReqToJson(GetDbItemReq data) => json.encode(data.toJson());

GetDbItemRes getDbItemResFromJson(String str) => GetDbItemRes.fromJson(json.decode(str));

String getDbItemResToJson(GetDbItemRes data) => json.encode(data.toJson());

TruncateDbReq truncateDbReqFromJson(String str) => TruncateDbReq.fromJson(json.decode(str));

String truncateDbReqToJson(TruncateDbReq data) => json.encode(data.toJson());

TruncateDbRes truncateDbResFromJson(String str) => TruncateDbRes.fromJson(json.decode(str));

String truncateDbResToJson(TruncateDbRes data) => json.encode(data.toJson());

DeleteDbItemReq deleteDbItemReqFromJson(String str) => DeleteDbItemReq.fromJson(json.decode(str));

String deleteDbItemReqToJson(DeleteDbItemReq data) => json.encode(data.toJson());

DeleteDbItemRes deleteDbItemResFromJson(String str) => DeleteDbItemRes.fromJson(json.decode(str));

String deleteDbItemResToJson(DeleteDbItemRes data) => json.encode(data.toJson());

GetMyBoardsReq getMyBoardsReqFromJson(String str) => GetMyBoardsReq.fromJson(json.decode(str));

String getMyBoardsReqToJson(GetMyBoardsReq data) => json.encode(data.toJson());

List<GetMyBoardsValue> getMyBoardsValueFromJson(String str) => List<GetMyBoardsValue>.from(json.decode(str).map((x) => GetMyBoardsValue.fromJson(x)));

String getMyBoardsValueToJson(List<GetMyBoardsValue> data) => json.encode(List<dynamic>.from(data.map((x) => x.toJson())));

List<GetMyBoardsUpdate> getMyBoardsUpdateFromJson(String str) => List<GetMyBoardsUpdate>.from(json.decode(str).map((x) => GetMyBoardsUpdate.fromJson(x)));

String getMyBoardsUpdateToJson(List<GetMyBoardsUpdate> data) => json.encode(List<dynamic>.from(data.map((x) => x.toJson())));

GetObserveReq getObserveReqFromJson(String str) => GetObserveReq.fromJson(json.decode(str));

String getObserveReqToJson(GetObserveReq data) => json.encode(data.toJson());

GetObserveValue getObserveValueFromJson(String str) => GetObserveValue.fromJson(json.decode(str));

String getObserveValueToJson(GetObserveValue data) => json.encode(data.toJson());

GetObserveUpdate getObserveUpdateFromJson(String str) => GetObserveUpdate.fromJson(json.decode(str));

String getObserveUpdateToJson(GetObserveUpdate data) => json.encode(data.toJson());

EchoReq echoReqFromJson(String str) => EchoReq.fromJson(json.decode(str));

String echoReqToJson(EchoReq data) => json.encode(data.toJson());

EchoRes echoResFromJson(String str) => EchoRes.fromJson(json.decode(str));

String echoResToJson(EchoRes data) => json.encode(data.toJson());

GetBoardReq getBoardReqFromJson(String str) => GetBoardReq.fromJson(json.decode(str));

String getBoardReqToJson(GetBoardReq data) => json.encode(data.toJson());

GetBoardValue getBoardValueFromJson(String str) => GetBoardValue.fromJson(json.decode(str));

String getBoardValueToJson(GetBoardValue data) => json.encode(data.toJson());

GetBoardUpdate getBoardUpdateFromJson(String str) => GetBoardUpdate.fromJson(json.decode(str));

String getBoardUpdateToJson(GetBoardUpdate data) => json.encode(data.toJson());

CreateCategoryReq createCategoryReqFromJson(String str) => CreateCategoryReq.fromJson(json.decode(str));

String createCategoryReqToJson(CreateCategoryReq data) => json.encode(data.toJson());

CreateCategoryRes createCategoryResFromJson(String str) => CreateCategoryRes.fromJson(json.decode(str));

String createCategoryResToJson(CreateCategoryRes data) => json.encode(data.toJson());

CreateTaskReq createTaskReqFromJson(String str) => CreateTaskReq.fromJson(json.decode(str));

String createTaskReqToJson(CreateTaskReq data) => json.encode(data.toJson());

CreateTaskRes createTaskResFromJson(String str) => CreateTaskRes.fromJson(json.decode(str));

String createTaskResToJson(CreateTaskRes data) => json.encode(data.toJson());

class StreamPutReq {
    String topic;
    String value;

    StreamPutReq({
        required this.topic,
        required this.value,
    });

    factory StreamPutReq.fromJson(Map<String, dynamic> json) => StreamPutReq(
        topic: json["topic"],
        value: json["value"],
    );

    Map<String, dynamic> toJson() => {
        "topic": topic,
        "value": value,
    };
}

class StreamPutRes {
    StreamPutRes();

    factory StreamPutRes.fromJson(Map<String, dynamic> json) => StreamPutRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetStreamReq {
    String topic;

    GetStreamReq({
        required this.topic,
    });

    factory GetStreamReq.fromJson(Map<String, dynamic> json) => GetStreamReq(
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

class DebugReq {
    DebugReq();

    factory DebugReq.fromJson(Map<String, dynamic> json) => DebugReq(
    );

    Map<String, dynamic> toJson() => {
    };
}

class DebugRes {
    DebugRes();

    factory DebugRes.fromJson(Map<String, dynamic> json) => DebugRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetMeReq {
    GetMeReq();

    factory GetMeReq.fromJson(Map<String, dynamic> json) => GetMeReq(
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
    List<double> authActivityLog;
    double createdAt;
    String email;
    String id;
    List<String> pk;
    double updatedAt;
    String userId;
    
    ///VerificationCode
    PurpleVerificationCode verificationCode;

    GetMeValueIdentity({
        required this.authActivityLog,
        required this.createdAt,
        required this.email,
        required this.id,
        required this.pk,
        required this.updatedAt,
        required this.userId,
        required this.verificationCode,
    });

    factory GetMeValueIdentity.fromJson(Map<String, dynamic> json) => GetMeValueIdentity(
        authActivityLog: List<double>.from(json["authActivityLog"].map((x) => x?.toDouble())),
        createdAt: json["createdAt"]?.toDouble(),
        email: json["email"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
        userId: json["userId"],
        verificationCode: PurpleVerificationCode.fromJson(json["verificationCode"]),
    );

    Map<String, dynamic> toJson() => {
        "authActivityLog": List<dynamic>.from(authActivityLog.map((x) => x)),
        "createdAt": createdAt,
        "email": email,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
        "userId": userId,
        "verificationCode": verificationCode.toJson(),
    };
}


///VerificationCode
class PurpleVerificationCode {
    String code;
    double expires;

    PurpleVerificationCode({
        required this.code,
        required this.expires,
    });

    factory PurpleVerificationCode.fromJson(Map<String, dynamic> json) => PurpleVerificationCode(
        code: json["code"],
        expires: json["expires"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "code": code,
        "expires": expires,
    };
}

class GetMeValueUser {
    double createdAt;
    String id;
    List<String> pk;
    double updatedAt;

    GetMeValueUser({
        required this.createdAt,
        required this.id,
        required this.pk,
        required this.updatedAt,
    });

    factory GetMeValueUser.fromJson(Map<String, dynamic> json) => GetMeValueUser(
        createdAt: json["createdAt"]?.toDouble(),
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
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
    List<double> authActivityLog;
    double createdAt;
    String email;
    String id;
    List<String> pk;
    double updatedAt;
    String userId;
    
    ///VerificationCode
    FluffyVerificationCode verificationCode;

    GetMeUpdateIdentity({
        required this.authActivityLog,
        required this.createdAt,
        required this.email,
        required this.id,
        required this.pk,
        required this.updatedAt,
        required this.userId,
        required this.verificationCode,
    });

    factory GetMeUpdateIdentity.fromJson(Map<String, dynamic> json) => GetMeUpdateIdentity(
        authActivityLog: List<double>.from(json["authActivityLog"].map((x) => x?.toDouble())),
        createdAt: json["createdAt"]?.toDouble(),
        email: json["email"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
        userId: json["userId"],
        verificationCode: FluffyVerificationCode.fromJson(json["verificationCode"]),
    );

    Map<String, dynamic> toJson() => {
        "authActivityLog": List<dynamic>.from(authActivityLog.map((x) => x)),
        "createdAt": createdAt,
        "email": email,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
        "userId": userId,
        "verificationCode": verificationCode.toJson(),
    };
}


///VerificationCode
class FluffyVerificationCode {
    String code;
    double expires;

    FluffyVerificationCode({
        required this.code,
        required this.expires,
    });

    factory FluffyVerificationCode.fromJson(Map<String, dynamic> json) => FluffyVerificationCode(
        code: json["code"],
        expires: json["expires"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "code": code,
        "expires": expires,
    };
}

class GetMeUpdateUser {
    double createdAt;
    String id;
    List<String> pk;
    double updatedAt;

    GetMeUpdateUser({
        required this.createdAt,
        required this.id,
        required this.pk,
        required this.updatedAt,
    });

    factory GetMeUpdateUser.fromJson(Map<String, dynamic> json) => GetMeUpdateUser(
        createdAt: json["createdAt"]?.toDouble(),
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class SendSignInEmailReq {
    String email;

    SendSignInEmailReq({
        required this.email,
    });

    factory SendSignInEmailReq.fromJson(Map<String, dynamic> json) => SendSignInEmailReq(
        email: json["email"],
    );

    Map<String, dynamic> toJson() => {
        "email": email,
    };
}

class SendSignInEmailRes {
    SendSignInEmailResType type;

    SendSignInEmailRes({
        required this.type,
    });

    factory SendSignInEmailRes.fromJson(Map<String, dynamic> json) => SendSignInEmailRes(
        type: sendSignInEmailResTypeValues.map[json["type"]]!,
    );

    Map<String, dynamic> toJson() => {
        "type": sendSignInEmailResTypeValues.reverse[type],
    };
}

enum SendSignInEmailResType {
    COOLDOWN,
    SUCCESS
}

final sendSignInEmailResTypeValues = EnumValues({
    "cooldown": SendSignInEmailResType.COOLDOWN,
    "success": SendSignInEmailResType.SUCCESS
});

class CreateBoardReq {
    String boardId;
    String key;
    String name;

    CreateBoardReq({
        required this.boardId,
        required this.key,
        required this.name,
    });

    factory CreateBoardReq.fromJson(Map<String, dynamic> json) => CreateBoardReq(
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

class CreateBoardRes {
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    String ownerId;
    List<String> pk;
    double updatedAt;

    CreateBoardRes({
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.ownerId,
        required this.pk,
        required this.updatedAt,
    });

    factory CreateBoardRes.fromJson(Map<String, dynamic> json) => CreateBoardRes(
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        ownerId: json["ownerId"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "ownerId": ownerId,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class VerifySignInCodeReq {
    String code;
    String email;

    VerifySignInCodeReq({
        required this.code,
        required this.email,
    });

    factory VerifySignInCodeReq.fromJson(Map<String, dynamic> json) => VerifySignInCodeReq(
        code: json["code"],
        email: json["email"],
    );

    Map<String, dynamic> toJson() => {
        "code": code,
        "email": email,
    };
}

class VerifySignInCodeRes {
    String? token;
    VerifySignInCodeResType type;

    VerifySignInCodeRes({
        this.token,
        required this.type,
    });

    factory VerifySignInCodeRes.fromJson(Map<String, dynamic> json) => VerifySignInCodeRes(
        token: json["token"],
        type: verifySignInCodeResTypeValues.map[json["type"]]!,
    );

    Map<String, dynamic> toJson() => {
        "token": token,
        "type": verifySignInCodeResTypeValues.reverse[type],
    };
}

enum VerifySignInCodeResType {
    CODE_EXPIRED,
    COOLDOWN,
    INVALID_CODE,
    SUCCESS
}

final verifySignInCodeResTypeValues = EnumValues({
    "code_expired": VerifySignInCodeResType.CODE_EXPIRED,
    "cooldown": VerifySignInCodeResType.COOLDOWN,
    "invalid_code": VerifySignInCodeResType.INVALID_CODE,
    "success": VerifySignInCodeResType.SUCCESS
});

class GetDbTreeReq {
    GetDbTreeReq();

    factory GetDbTreeReq.fromJson(Map<String, dynamic> json) => GetDbTreeReq(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetDbTreeRes {
    List<GetDbTreeRe> childrenPreview;
    dynamic key;
    String name;
    ChildrenPreviewType type;

    GetDbTreeRes({
        required this.childrenPreview,
        required this.key,
        required this.name,
        required this.type,
    });

    factory GetDbTreeRes.fromJson(Map<String, dynamic> json) => GetDbTreeRes(
        childrenPreview: List<GetDbTreeRe>.from(json["childrenPreview"].map((x) => GetDbTreeRe.fromJson(x))),
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

class GetDbTreeRe {
    List<GetDbTreeRe> childrenPreview;
    dynamic key;
    String name;
    ChildrenPreviewType type;

    GetDbTreeRe({
        required this.childrenPreview,
        required this.key,
        required this.name,
        required this.type,
    });

    factory GetDbTreeRe.fromJson(Map<String, dynamic> json) => GetDbTreeRe(
        childrenPreview: List<GetDbTreeRe>.from(json["childrenPreview"].map((x) => GetDbTreeRe.fromJson(x))),
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

class GetDbItemReq {
    List<dynamic> path;

    GetDbItemReq({
        required this.path,
    });

    factory GetDbItemReq.fromJson(Map<String, dynamic> json) => GetDbItemReq(
        path: List<dynamic>.from(json["path"].map((x) => x)),
    );

    Map<String, dynamic> toJson() => {
        "path": List<dynamic>.from(path.map((x) => x)),
    };
}

class GetDbItemRes {
    ChildrenPreviewType type;
    dynamic snapshot;

    GetDbItemRes({
        required this.type,
        this.snapshot,
    });

    factory GetDbItemRes.fromJson(Map<String, dynamic> json) => GetDbItemRes(
        type: childrenPreviewTypeValues.map[json["type"]]!,
        snapshot: json["snapshot"],
    );

    Map<String, dynamic> toJson() => {
        "type": childrenPreviewTypeValues.reverse[type],
        "snapshot": snapshot,
    };
}

class TruncateDbReq {
    TruncateDbReq();

    factory TruncateDbReq.fromJson(Map<String, dynamic> json) => TruncateDbReq(
    );

    Map<String, dynamic> toJson() => {
    };
}

class TruncateDbRes {
    TruncateDbRes();

    factory TruncateDbRes.fromJson(Map<String, dynamic> json) => TruncateDbRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class DeleteDbItemReq {
    List<dynamic> path;

    DeleteDbItemReq({
        required this.path,
    });

    factory DeleteDbItemReq.fromJson(Map<String, dynamic> json) => DeleteDbItemReq(
        path: List<dynamic>.from(json["path"].map((x) => x)),
    );

    Map<String, dynamic> toJson() => {
        "path": List<dynamic>.from(path.map((x) => x)),
    };
}

class DeleteDbItemRes {
    DeleteDbItemRes();

    factory DeleteDbItemRes.fromJson(Map<String, dynamic> json) => DeleteDbItemRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetMyBoardsReq {
    GetMyBoardsReq();

    factory GetMyBoardsReq.fromJson(Map<String, dynamic> json) => GetMyBoardsReq(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetMyBoardsValue {
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    String ownerId;
    List<String> pk;
    double updatedAt;

    GetMyBoardsValue({
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.ownerId,
        required this.pk,
        required this.updatedAt,
    });

    factory GetMyBoardsValue.fromJson(Map<String, dynamic> json) => GetMyBoardsValue(
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        ownerId: json["ownerId"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "ownerId": ownerId,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class GetMyBoardsUpdate {
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    String ownerId;
    List<String> pk;
    double updatedAt;

    GetMyBoardsUpdate({
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.ownerId,
        required this.pk,
        required this.updatedAt,
    });

    factory GetMyBoardsUpdate.fromJson(Map<String, dynamic> json) => GetMyBoardsUpdate(
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        ownerId: json["ownerId"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "ownerId": ownerId,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class GetObserveReq {
    String topic;

    GetObserveReq({
        required this.topic,
    });

    factory GetObserveReq.fromJson(Map<String, dynamic> json) => GetObserveReq(
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

class EchoReq {
    String msg;

    EchoReq({
        required this.msg,
    });

    factory EchoReq.fromJson(Map<String, dynamic> json) => EchoReq(
        msg: json["msg"],
    );

    Map<String, dynamic> toJson() => {
        "msg": msg,
    };
}

class EchoRes {
    String msg;

    EchoRes({
        required this.msg,
    });

    factory EchoRes.fromJson(Map<String, dynamic> json) => EchoRes(
        msg: json["msg"],
    );

    Map<String, dynamic> toJson() => {
        "msg": msg,
    };
}

class GetBoardReq {
    String key;

    GetBoardReq({
        required this.key,
    });

    factory GetBoardReq.fromJson(Map<String, dynamic> json) => GetBoardReq(
        key: json["key"],
    );

    Map<String, dynamic> toJson() => {
        "key": key,
    };
}

class GetBoardValue {
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    String ownerId;
    List<String> pk;
    double updatedAt;

    GetBoardValue({
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.ownerId,
        required this.pk,
        required this.updatedAt,
    });

    factory GetBoardValue.fromJson(Map<String, dynamic> json) => GetBoardValue(
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        ownerId: json["ownerId"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "ownerId": ownerId,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class GetBoardUpdate {
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    String ownerId;
    List<String> pk;
    double updatedAt;

    GetBoardUpdate({
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.ownerId,
        required this.pk,
        required this.updatedAt,
    });

    factory GetBoardUpdate.fromJson(Map<String, dynamic> json) => GetBoardUpdate(
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        ownerId: json["ownerId"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "ownerId": ownerId,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class CreateCategoryReq {
    String boardId;
    String columnId;
    String title;

    CreateCategoryReq({
        required this.boardId,
        required this.columnId,
        required this.title,
    });

    factory CreateCategoryReq.fromJson(Map<String, dynamic> json) => CreateCategoryReq(
        boardId: json["boardId"],
        columnId: json["columnId"],
        title: json["title"],
    );

    Map<String, dynamic> toJson() => {
        "boardId": boardId,
        "columnId": columnId,
        "title": title,
    };
}

class CreateCategoryRes {
    String authorId;
    String boardId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String title;
    double updatedAt;

    CreateCategoryRes({
        required this.authorId,
        required this.boardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.title,
        required this.updatedAt,
    });

    factory CreateCategoryRes.fromJson(Map<String, dynamic> json) => CreateCategoryRes(
        authorId: json["authorId"],
        boardId: json["boardId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        title: json["title"],
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "boardId": boardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "title": title,
        "updatedAt": updatedAt,
    };
}

class CreateTaskReq {
    String boardId;
    Placement placement;
    String taskId;
    String title;

    CreateTaskReq({
        required this.boardId,
        required this.placement,
        required this.taskId,
        required this.title,
    });

    factory CreateTaskReq.fromJson(Map<String, dynamic> json) => CreateTaskReq(
        boardId: json["boardId"],
        placement: Placement.fromJson(json["placement"]),
        taskId: json["taskId"],
        title: json["title"],
    );

    Map<String, dynamic> toJson() => {
        "boardId": boardId,
        "placement": placement.toJson(),
        "taskId": taskId,
        "title": title,
    };
}

class Placement {
    Position? position;
    PlacementType type;
    PositionA? positionA;
    PositionB? positionB;

    Placement({
        this.position,
        required this.type,
        this.positionA,
        this.positionB,
    });

    factory Placement.fromJson(Map<String, dynamic> json) => Placement(
        position: json["position"] == null ? null : Position.fromJson(json["position"]),
        type: placementTypeValues.map[json["type"]]!,
        positionA: json["positionA"] == null ? null : PositionA.fromJson(json["positionA"]),
        positionB: json["positionB"] == null ? null : PositionB.fromJson(json["positionB"]),
    );

    Map<String, dynamic> toJson() => {
        "position": position?.toJson(),
        "type": placementTypeValues.reverse[type],
        "positionA": positionA?.toJson(),
        "positionB": positionB?.toJson(),
    };
}

class Position {
    String denominator;
    String numerator;

    Position({
        required this.denominator,
        required this.numerator,
    });

    factory Position.fromJson(Map<String, dynamic> json) => Position(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

class PositionA {
    String denominator;
    String numerator;

    PositionA({
        required this.denominator,
        required this.numerator,
    });

    factory PositionA.fromJson(Map<String, dynamic> json) => PositionA(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

class PositionB {
    String denominator;
    String numerator;

    PositionB({
        required this.denominator,
        required this.numerator,
    });

    factory PositionB.fromJson(Map<String, dynamic> json) => PositionB(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

enum PlacementType {
    AFTER,
    BEFORE,
    BETWEEN,
    RANDOM
}

final placementTypeValues = EnumValues({
    "after": PlacementType.AFTER,
    "before": PlacementType.BEFORE,
    "between": PlacementType.BETWEEN,
    "random": PlacementType.RANDOM
});

class CreateTaskRes {
    String authorId;
    String boardId;
    String? categoryId;
    CategoryPosition categoryPosition;
    double counter;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String title;
    double updatedAt;

    CreateTaskRes({
        required this.authorId,
        required this.boardId,
        required this.categoryId,
        required this.categoryPosition,
        required this.counter,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.title,
        required this.updatedAt,
    });

    factory CreateTaskRes.fromJson(Map<String, dynamic> json) => CreateTaskRes(
        authorId: json["authorId"],
        boardId: json["boardId"],
        categoryId: json["categoryId"],
        categoryPosition: CategoryPosition.fromJson(json["categoryPosition"]),
        counter: json["counter"]?.toDouble(),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        title: json["title"],
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "boardId": boardId,
        "categoryId": categoryId,
        "categoryPosition": categoryPosition.toJson(),
        "counter": counter,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "title": title,
        "updatedAt": updatedAt,
    };
}

class CategoryPosition {
    String denominator;
    String numerator;

    CategoryPosition({
        required this.denominator,
        required this.numerator,
    });

    factory CategoryPosition.fromJson(Map<String, dynamic> json) => CategoryPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
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
