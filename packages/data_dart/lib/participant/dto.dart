// To parse this JSON data, do
//
//     final streamPutReq = streamPutReqFromJson(jsonString);
//     final streamPutRes = streamPutResFromJson(jsonString);
//     final getStreamReq = getStreamReqFromJson(jsonString);
//     final getStreamItem = getStreamItemFromJson(jsonString);
//     final debugReq = debugReqFromJson(jsonString);
//     final debugRes = debugResFromJson(jsonString);
//     final getMeReq = getMeReqFromJson(jsonString);
//     final getMeItem = getMeItemFromJson(jsonString);
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
//     final getMyBoardsItem = getMyBoardsItemFromJson(jsonString);
//     final echoReq = echoReqFromJson(jsonString);
//     final echoRes = echoResFromJson(jsonString);
//     final getBoardReq = getBoardReqFromJson(jsonString);
//     final getBoardItem = getBoardItemFromJson(jsonString);
//     final createColumnReq = createColumnReqFromJson(jsonString);
//     final createColumnRes = createColumnResFromJson(jsonString);
//     final createTaskReq = createTaskReqFromJson(jsonString);
//     final createTaskRes = createTaskResFromJson(jsonString);
//     final getBoardViewReq = getBoardViewReqFromJson(jsonString);
//     final getBoardViewItem = getBoardViewItemFromJson(jsonString);
//     final deleteBoardReq = deleteBoardReqFromJson(jsonString);
//     final deleteBoardRes = deleteBoardResFromJson(jsonString);
//     final deleteColumnReq = deleteColumnReqFromJson(jsonString);
//     final deleteColumnRes = deleteColumnResFromJson(jsonString);
//     final deleteTaskReq = deleteTaskReqFromJson(jsonString);
//     final deleteTaskRes = deleteTaskResFromJson(jsonString);
//     final setTaskTitleReq = setTaskTitleReqFromJson(jsonString);
//     final setTaskTitleRes = setTaskTitleResFromJson(jsonString);
//     final setTaskColumnIdReq = setTaskColumnIdReqFromJson(jsonString);
//     final setTaskColumnIdRes = setTaskColumnIdResFromJson(jsonString);
//     final setColumnTitleReq = setColumnTitleReqFromJson(jsonString);
//     final setColumnTitleRes = setColumnTitleResFromJson(jsonString);
//     final setBoardNameReq = setBoardNameReqFromJson(jsonString);
//     final setBoardNameRes = setBoardNameResFromJson(jsonString);
//     final createCommentReq = createCommentReqFromJson(jsonString);
//     final createCommentRes = createCommentResFromJson(jsonString);
//     final deleteCommentReq = deleteCommentReqFromJson(jsonString);
//     final deleteCommentRes = deleteCommentResFromJson(jsonString);
//     final getTaskCommentsReq = getTaskCommentsReqFromJson(jsonString);
//     final getTaskCommentsItem = getTaskCommentsItemFromJson(jsonString);
//     final createMemberReq = createMemberReqFromJson(jsonString);
//     final createMemberRes = createMemberResFromJson(jsonString);
//     final deleteMemberReq = deleteMemberReqFromJson(jsonString);
//     final deleteMemberRes = deleteMemberResFromJson(jsonString);
//     final getBoardMembersReq = getBoardMembersReqFromJson(jsonString);
//     final getBoardMembersItem = getBoardMembersItemFromJson(jsonString);
//     final setUserFullNameReq = setUserFullNameReqFromJson(jsonString);
//     final setUserFullNameRes = setUserFullNameResFromJson(jsonString);

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

GetMeItem getMeItemFromJson(String str) => GetMeItem.fromJson(json.decode(str));

String getMeItemToJson(GetMeItem data) => json.encode(data.toJson());

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

List<GetMyBoardsItem> getMyBoardsItemFromJson(String str) => List<GetMyBoardsItem>.from(json.decode(str).map((x) => GetMyBoardsItem.fromJson(x)));

String getMyBoardsItemToJson(List<GetMyBoardsItem> data) => json.encode(List<dynamic>.from(data.map((x) => x.toJson())));

EchoReq echoReqFromJson(String str) => EchoReq.fromJson(json.decode(str));

String echoReqToJson(EchoReq data) => json.encode(data.toJson());

EchoRes echoResFromJson(String str) => EchoRes.fromJson(json.decode(str));

String echoResToJson(EchoRes data) => json.encode(data.toJson());

GetBoardReq getBoardReqFromJson(String str) => GetBoardReq.fromJson(json.decode(str));

String getBoardReqToJson(GetBoardReq data) => json.encode(data.toJson());

GetBoardItem getBoardItemFromJson(String str) => GetBoardItem.fromJson(json.decode(str));

String getBoardItemToJson(GetBoardItem data) => json.encode(data.toJson());

CreateColumnReq createColumnReqFromJson(String str) => CreateColumnReq.fromJson(json.decode(str));

String createColumnReqToJson(CreateColumnReq data) => json.encode(data.toJson());

CreateColumnRes createColumnResFromJson(String str) => CreateColumnRes.fromJson(json.decode(str));

String createColumnResToJson(CreateColumnRes data) => json.encode(data.toJson());

CreateTaskReq createTaskReqFromJson(String str) => CreateTaskReq.fromJson(json.decode(str));

String createTaskReqToJson(CreateTaskReq data) => json.encode(data.toJson());

CreateTaskRes createTaskResFromJson(String str) => CreateTaskRes.fromJson(json.decode(str));

String createTaskResToJson(CreateTaskRes data) => json.encode(data.toJson());

GetBoardViewReq getBoardViewReqFromJson(String str) => GetBoardViewReq.fromJson(json.decode(str));

String getBoardViewReqToJson(GetBoardViewReq data) => json.encode(data.toJson());

GetBoardViewItem getBoardViewItemFromJson(String str) => GetBoardViewItem.fromJson(json.decode(str));

String getBoardViewItemToJson(GetBoardViewItem data) => json.encode(data.toJson());

DeleteBoardReq deleteBoardReqFromJson(String str) => DeleteBoardReq.fromJson(json.decode(str));

String deleteBoardReqToJson(DeleteBoardReq data) => json.encode(data.toJson());

DeleteBoardRes deleteBoardResFromJson(String str) => DeleteBoardRes.fromJson(json.decode(str));

String deleteBoardResToJson(DeleteBoardRes data) => json.encode(data.toJson());

DeleteColumnReq deleteColumnReqFromJson(String str) => DeleteColumnReq.fromJson(json.decode(str));

String deleteColumnReqToJson(DeleteColumnReq data) => json.encode(data.toJson());

DeleteColumnRes deleteColumnResFromJson(String str) => DeleteColumnRes.fromJson(json.decode(str));

String deleteColumnResToJson(DeleteColumnRes data) => json.encode(data.toJson());

DeleteTaskReq deleteTaskReqFromJson(String str) => DeleteTaskReq.fromJson(json.decode(str));

String deleteTaskReqToJson(DeleteTaskReq data) => json.encode(data.toJson());

DeleteTaskRes deleteTaskResFromJson(String str) => DeleteTaskRes.fromJson(json.decode(str));

String deleteTaskResToJson(DeleteTaskRes data) => json.encode(data.toJson());

SetTaskTitleReq setTaskTitleReqFromJson(String str) => SetTaskTitleReq.fromJson(json.decode(str));

String setTaskTitleReqToJson(SetTaskTitleReq data) => json.encode(data.toJson());

SetTaskTitleRes setTaskTitleResFromJson(String str) => SetTaskTitleRes.fromJson(json.decode(str));

String setTaskTitleResToJson(SetTaskTitleRes data) => json.encode(data.toJson());

SetTaskColumnIdReq setTaskColumnIdReqFromJson(String str) => SetTaskColumnIdReq.fromJson(json.decode(str));

String setTaskColumnIdReqToJson(SetTaskColumnIdReq data) => json.encode(data.toJson());

SetTaskColumnIdRes setTaskColumnIdResFromJson(String str) => SetTaskColumnIdRes.fromJson(json.decode(str));

String setTaskColumnIdResToJson(SetTaskColumnIdRes data) => json.encode(data.toJson());

SetColumnTitleReq setColumnTitleReqFromJson(String str) => SetColumnTitleReq.fromJson(json.decode(str));

String setColumnTitleReqToJson(SetColumnTitleReq data) => json.encode(data.toJson());

SetColumnTitleRes setColumnTitleResFromJson(String str) => SetColumnTitleRes.fromJson(json.decode(str));

String setColumnTitleResToJson(SetColumnTitleRes data) => json.encode(data.toJson());

SetBoardNameReq setBoardNameReqFromJson(String str) => SetBoardNameReq.fromJson(json.decode(str));

String setBoardNameReqToJson(SetBoardNameReq data) => json.encode(data.toJson());

SetBoardNameRes setBoardNameResFromJson(String str) => SetBoardNameRes.fromJson(json.decode(str));

String setBoardNameResToJson(SetBoardNameRes data) => json.encode(data.toJson());

CreateCommentReq createCommentReqFromJson(String str) => CreateCommentReq.fromJson(json.decode(str));

String createCommentReqToJson(CreateCommentReq data) => json.encode(data.toJson());

CreateCommentRes createCommentResFromJson(String str) => CreateCommentRes.fromJson(json.decode(str));

String createCommentResToJson(CreateCommentRes data) => json.encode(data.toJson());

DeleteCommentReq deleteCommentReqFromJson(String str) => DeleteCommentReq.fromJson(json.decode(str));

String deleteCommentReqToJson(DeleteCommentReq data) => json.encode(data.toJson());

DeleteCommentRes deleteCommentResFromJson(String str) => DeleteCommentRes.fromJson(json.decode(str));

String deleteCommentResToJson(DeleteCommentRes data) => json.encode(data.toJson());

GetTaskCommentsReq getTaskCommentsReqFromJson(String str) => GetTaskCommentsReq.fromJson(json.decode(str));

String getTaskCommentsReqToJson(GetTaskCommentsReq data) => json.encode(data.toJson());

List<GetTaskCommentsItem> getTaskCommentsItemFromJson(String str) => List<GetTaskCommentsItem>.from(json.decode(str).map((x) => GetTaskCommentsItem.fromJson(x)));

String getTaskCommentsItemToJson(List<GetTaskCommentsItem> data) => json.encode(List<dynamic>.from(data.map((x) => x.toJson())));

CreateMemberReq createMemberReqFromJson(String str) => CreateMemberReq.fromJson(json.decode(str));

String createMemberReqToJson(CreateMemberReq data) => json.encode(data.toJson());

CreateMemberRes createMemberResFromJson(String str) => CreateMemberRes.fromJson(json.decode(str));

String createMemberResToJson(CreateMemberRes data) => json.encode(data.toJson());

DeleteMemberReq deleteMemberReqFromJson(String str) => DeleteMemberReq.fromJson(json.decode(str));

String deleteMemberReqToJson(DeleteMemberReq data) => json.encode(data.toJson());

DeleteMemberRes deleteMemberResFromJson(String str) => DeleteMemberRes.fromJson(json.decode(str));

String deleteMemberResToJson(DeleteMemberRes data) => json.encode(data.toJson());

GetBoardMembersReq getBoardMembersReqFromJson(String str) => GetBoardMembersReq.fromJson(json.decode(str));

String getBoardMembersReqToJson(GetBoardMembersReq data) => json.encode(data.toJson());

List<GetBoardMembersItem> getBoardMembersItemFromJson(String str) => List<GetBoardMembersItem>.from(json.decode(str).map((x) => GetBoardMembersItem.fromJson(x)));

String getBoardMembersItemToJson(List<GetBoardMembersItem> data) => json.encode(List<dynamic>.from(data.map((x) => x.toJson())));

SetUserFullNameReq setUserFullNameReqFromJson(String str) => SetUserFullNameReq.fromJson(json.decode(str));

String setUserFullNameReqToJson(SetUserFullNameReq data) => json.encode(data.toJson());

SetUserFullNameRes setUserFullNameResFromJson(String str) => SetUserFullNameRes.fromJson(json.decode(str));

String setUserFullNameResToJson(SetUserFullNameRes data) => json.encode(data.toJson());

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

class GetMeItem {
    Identity identity;
    GetMeItemUser user;

    GetMeItem({
        required this.identity,
        required this.user,
    });

    factory GetMeItem.fromJson(Map<String, dynamic> json) => GetMeItem(
        identity: Identity.fromJson(json["identity"]),
        user: GetMeItemUser.fromJson(json["user"]),
    );

    Map<String, dynamic> toJson() => {
        "identity": identity.toJson(),
        "user": user.toJson(),
    };
}

class Identity {
    List<double> authActivityLog;
    double createdAt;
    bool deleted;
    String email;
    String id;
    List<String> pk;
    double updatedAt;
    String userId;
    
    ///VerificationCode
    VerificationCode verificationCode;

    Identity({
        required this.authActivityLog,
        required this.createdAt,
        required this.deleted,
        required this.email,
        required this.id,
        required this.pk,
        required this.updatedAt,
        required this.userId,
        required this.verificationCode,
    });

    factory Identity.fromJson(Map<String, dynamic> json) => Identity(
        authActivityLog: List<double>.from(json["authActivityLog"].map((x) => x?.toDouble())),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        email: json["email"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
        userId: json["userId"],
        verificationCode: VerificationCode.fromJson(json["verificationCode"]),
    );

    Map<String, dynamic> toJson() => {
        "authActivityLog": List<dynamic>.from(authActivityLog.map((x) => x)),
        "createdAt": createdAt,
        "deleted": deleted,
        "email": email,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
        "userId": userId,
        "verificationCode": verificationCode.toJson(),
    };
}


///VerificationCode
class VerificationCode {
    String code;
    double expires;

    VerificationCode({
        required this.code,
        required this.expires,
    });

    factory VerificationCode.fromJson(Map<String, dynamic> json) => VerificationCode(
        code: json["code"],
        expires: json["expires"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "code": code,
        "expires": expires,
    };
}

class GetMeItemUser {
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    double updatedAt;
    Version version;

    GetMeItemUser({
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.updatedAt,
        required this.version,
    });

    factory GetMeItemUser.fromJson(Map<String, dynamic> json) => GetMeItemUser(
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
        version: versionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
        "version": versionValues.reverse[version],
    };
}

enum Version {
    THE_4
}

final versionValues = EnumValues({
    "4": Version.THE_4
});

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
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    CreateBoardRes({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory CreateBoardRes.fromJson(Map<String, dynamic> json) => CreateBoardRes(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
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

class GetMyBoardsItem {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    GetMyBoardsItem({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory GetMyBoardsItem.fromJson(Map<String, dynamic> json) => GetMyBoardsItem(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
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

class GetBoardItem {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    GetBoardItem({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory GetBoardItem.fromJson(Map<String, dynamic> json) => GetBoardItem(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class CreateColumnReq {
    String boardId;
    String columnId;
    String title;

    CreateColumnReq({
        required this.boardId,
        required this.columnId,
        required this.title,
    });

    factory CreateColumnReq.fromJson(Map<String, dynamic> json) => CreateColumnReq(
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

class CreateColumnRes {
    String authorId;
    CreateColumnResBoard board;
    String boardId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String title;
    double updatedAt;

    CreateColumnRes({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.title,
        required this.updatedAt,
    });

    factory CreateColumnRes.fromJson(Map<String, dynamic> json) => CreateColumnRes(
        authorId: json["authorId"],
        board: CreateColumnResBoard.fromJson(json["board"]),
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
        "board": board.toJson(),
        "boardId": boardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "title": title,
        "updatedAt": updatedAt,
    };
}

class CreateColumnResBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    CreateColumnResBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory CreateColumnResBoard.fromJson(Map<String, dynamic> json) => CreateColumnResBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class CreateTaskReq {
    String boardId;
    String? columnId;
    Placement placement;
    String taskId;
    String title;

    CreateTaskReq({
        required this.boardId,
        required this.columnId,
        required this.placement,
        required this.taskId,
        required this.title,
    });

    factory CreateTaskReq.fromJson(Map<String, dynamic> json) => CreateTaskReq(
        boardId: json["boardId"],
        columnId: json["columnId"],
        placement: Placement.fromJson(json["placement"]),
        taskId: json["taskId"],
        title: json["title"],
    );

    Map<String, dynamic> toJson() => {
        "boardId": boardId,
        "columnId": columnId,
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
    String? columnId;
    CreateTaskResColumnPosition columnPosition;
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
        required this.columnId,
        required this.columnPosition,
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
        columnId: json["columnId"],
        columnPosition: CreateTaskResColumnPosition.fromJson(json["columnPosition"]),
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
        "columnId": columnId,
        "columnPosition": columnPosition.toJson(),
        "counter": counter,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "title": title,
        "updatedAt": updatedAt,
    };
}

class CreateTaskResColumnPosition {
    String denominator;
    String numerator;

    CreateTaskResColumnPosition({
        required this.denominator,
        required this.numerator,
    });

    factory CreateTaskResColumnPosition.fromJson(Map<String, dynamic> json) => CreateTaskResColumnPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

class GetBoardViewReq {
    String key;

    GetBoardViewReq({
        required this.key,
    });

    factory GetBoardViewReq.fromJson(Map<String, dynamic> json) => GetBoardViewReq(
        key: json["key"],
    );

    Map<String, dynamic> toJson() => {
        "key": key,
    };
}

class GetBoardViewItem {
    GetBoardViewItemBoard board;
    List<ColumnElement> columns;
    List<TaskElement> tasks;

    GetBoardViewItem({
        required this.board,
        required this.columns,
        required this.tasks,
    });

    factory GetBoardViewItem.fromJson(Map<String, dynamic> json) => GetBoardViewItem(
        board: GetBoardViewItemBoard.fromJson(json["board"]),
        columns: List<ColumnElement>.from(json["columns"].map((x) => ColumnElement.fromJson(x))),
        tasks: List<TaskElement>.from(json["tasks"].map((x) => TaskElement.fromJson(x))),
    );

    Map<String, dynamic> toJson() => {
        "board": board.toJson(),
        "columns": List<dynamic>.from(columns.map((x) => x.toJson())),
        "tasks": List<dynamic>.from(tasks.map((x) => x.toJson())),
    };
}

class GetBoardViewItemBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    GetBoardViewItemBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory GetBoardViewItemBoard.fromJson(Map<String, dynamic> json) => GetBoardViewItemBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class ColumnElement {
    String authorId;
    PurpleBoard board;
    String boardId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String title;
    double updatedAt;

    ColumnElement({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.title,
        required this.updatedAt,
    });

    factory ColumnElement.fromJson(Map<String, dynamic> json) => ColumnElement(
        authorId: json["authorId"],
        board: PurpleBoard.fromJson(json["board"]),
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
        "board": board.toJson(),
        "boardId": boardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "title": title,
        "updatedAt": updatedAt,
    };
}

class PurpleBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    PurpleBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory PurpleBoard.fromJson(Map<String, dynamic> json) => PurpleBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class TaskElement {
    String authorId;
    FluffyBoard board;
    String boardId;
    PurpleColumn? column;
    String? columnId;
    PurpleColumnPosition columnPosition;
    double counter;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String title;
    double updatedAt;

    TaskElement({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.column,
        required this.columnId,
        required this.columnPosition,
        required this.counter,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.title,
        required this.updatedAt,
    });

    factory TaskElement.fromJson(Map<String, dynamic> json) => TaskElement(
        authorId: json["authorId"],
        board: FluffyBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        column: json["column"] == null ? null : PurpleColumn.fromJson(json["column"]),
        columnId: json["columnId"],
        columnPosition: PurpleColumnPosition.fromJson(json["columnPosition"]),
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
        "board": board.toJson(),
        "boardId": boardId,
        "column": column?.toJson(),
        "columnId": columnId,
        "columnPosition": columnPosition.toJson(),
        "counter": counter,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "title": title,
        "updatedAt": updatedAt,
    };
}

class FluffyBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    FluffyBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory FluffyBoard.fromJson(Map<String, dynamic> json) => FluffyBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class PurpleColumn {
    String authorId;
    TentacledBoard board;
    String boardId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String title;
    double updatedAt;

    PurpleColumn({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.title,
        required this.updatedAt,
    });

    factory PurpleColumn.fromJson(Map<String, dynamic> json) => PurpleColumn(
        authorId: json["authorId"],
        board: TentacledBoard.fromJson(json["board"]),
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
        "board": board.toJson(),
        "boardId": boardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "title": title,
        "updatedAt": updatedAt,
    };
}

class TentacledBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    TentacledBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory TentacledBoard.fromJson(Map<String, dynamic> json) => TentacledBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class PurpleColumnPosition {
    String denominator;
    String numerator;

    PurpleColumnPosition({
        required this.denominator,
        required this.numerator,
    });

    factory PurpleColumnPosition.fromJson(Map<String, dynamic> json) => PurpleColumnPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

class DeleteBoardReq {
    String boardId;

    DeleteBoardReq({
        required this.boardId,
    });

    factory DeleteBoardReq.fromJson(Map<String, dynamic> json) => DeleteBoardReq(
        boardId: json["boardId"],
    );

    Map<String, dynamic> toJson() => {
        "boardId": boardId,
    };
}

class DeleteBoardRes {
    DeleteBoardRes();

    factory DeleteBoardRes.fromJson(Map<String, dynamic> json) => DeleteBoardRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class DeleteColumnReq {
    String columnId;

    DeleteColumnReq({
        required this.columnId,
    });

    factory DeleteColumnReq.fromJson(Map<String, dynamic> json) => DeleteColumnReq(
        columnId: json["columnId"],
    );

    Map<String, dynamic> toJson() => {
        "columnId": columnId,
    };
}

class DeleteColumnRes {
    DeleteColumnRes();

    factory DeleteColumnRes.fromJson(Map<String, dynamic> json) => DeleteColumnRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class DeleteTaskReq {
    String taskId;

    DeleteTaskReq({
        required this.taskId,
    });

    factory DeleteTaskReq.fromJson(Map<String, dynamic> json) => DeleteTaskReq(
        taskId: json["taskId"],
    );

    Map<String, dynamic> toJson() => {
        "taskId": taskId,
    };
}

class DeleteTaskRes {
    DeleteTaskRes();

    factory DeleteTaskRes.fromJson(Map<String, dynamic> json) => DeleteTaskRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class SetTaskTitleReq {
    String taskId;
    String title;

    SetTaskTitleReq({
        required this.taskId,
        required this.title,
    });

    factory SetTaskTitleReq.fromJson(Map<String, dynamic> json) => SetTaskTitleReq(
        taskId: json["taskId"],
        title: json["title"],
    );

    Map<String, dynamic> toJson() => {
        "taskId": taskId,
        "title": title,
    };
}

class SetTaskTitleRes {
    SetTaskTitleRes();

    factory SetTaskTitleRes.fromJson(Map<String, dynamic> json) => SetTaskTitleRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class SetTaskColumnIdReq {
    String? columnId;
    String taskId;

    SetTaskColumnIdReq({
        required this.columnId,
        required this.taskId,
    });

    factory SetTaskColumnIdReq.fromJson(Map<String, dynamic> json) => SetTaskColumnIdReq(
        columnId: json["columnId"],
        taskId: json["taskId"],
    );

    Map<String, dynamic> toJson() => {
        "columnId": columnId,
        "taskId": taskId,
    };
}

class SetTaskColumnIdRes {
    SetTaskColumnIdRes();

    factory SetTaskColumnIdRes.fromJson(Map<String, dynamic> json) => SetTaskColumnIdRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class SetColumnTitleReq {
    String columnId;
    String title;

    SetColumnTitleReq({
        required this.columnId,
        required this.title,
    });

    factory SetColumnTitleReq.fromJson(Map<String, dynamic> json) => SetColumnTitleReq(
        columnId: json["columnId"],
        title: json["title"],
    );

    Map<String, dynamic> toJson() => {
        "columnId": columnId,
        "title": title,
    };
}

class SetColumnTitleRes {
    SetColumnTitleRes();

    factory SetColumnTitleRes.fromJson(Map<String, dynamic> json) => SetColumnTitleRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class SetBoardNameReq {
    String boardId;
    String name;

    SetBoardNameReq({
        required this.boardId,
        required this.name,
    });

    factory SetBoardNameReq.fromJson(Map<String, dynamic> json) => SetBoardNameReq(
        boardId: json["boardId"],
        name: json["name"],
    );

    Map<String, dynamic> toJson() => {
        "boardId": boardId,
        "name": name,
    };
}

class SetBoardNameRes {
    SetBoardNameRes();

    factory SetBoardNameRes.fromJson(Map<String, dynamic> json) => SetBoardNameRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class CreateCommentReq {
    String commentId;
    String taskId;
    String text;

    CreateCommentReq({
        required this.commentId,
        required this.taskId,
        required this.text,
    });

    factory CreateCommentReq.fromJson(Map<String, dynamic> json) => CreateCommentReq(
        commentId: json["commentId"],
        taskId: json["taskId"],
        text: json["text"],
    );

    Map<String, dynamic> toJson() => {
        "commentId": commentId,
        "taskId": taskId,
        "text": text,
    };
}

class CreateCommentRes {
    CreateCommentResAuthor author;
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    CreateCommentResTask task;
    String taskId;
    String text;
    double updatedAt;

    CreateCommentRes({
        required this.author,
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.task,
        required this.taskId,
        required this.text,
        required this.updatedAt,
    });

    factory CreateCommentRes.fromJson(Map<String, dynamic> json) => CreateCommentRes(
        author: CreateCommentResAuthor.fromJson(json["author"]),
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        task: CreateCommentResTask.fromJson(json["task"]),
        taskId: json["taskId"],
        text: json["text"],
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "author": author.toJson(),
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "task": task.toJson(),
        "taskId": taskId,
        "text": text,
        "updatedAt": updatedAt,
    };
}

class CreateCommentResAuthor {
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    double updatedAt;
    Version version;

    CreateCommentResAuthor({
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.updatedAt,
        required this.version,
    });

    factory CreateCommentResAuthor.fromJson(Map<String, dynamic> json) => CreateCommentResAuthor(
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
        version: versionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
        "version": versionValues.reverse[version],
    };
}

class CreateCommentResTask {
    String authorId;
    StickyBoard board;
    String boardId;
    FluffyColumn? column;
    String? columnId;
    FluffyColumnPosition columnPosition;
    double counter;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String title;
    double updatedAt;

    CreateCommentResTask({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.column,
        required this.columnId,
        required this.columnPosition,
        required this.counter,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.title,
        required this.updatedAt,
    });

    factory CreateCommentResTask.fromJson(Map<String, dynamic> json) => CreateCommentResTask(
        authorId: json["authorId"],
        board: StickyBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        column: json["column"] == null ? null : FluffyColumn.fromJson(json["column"]),
        columnId: json["columnId"],
        columnPosition: FluffyColumnPosition.fromJson(json["columnPosition"]),
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
        "board": board.toJson(),
        "boardId": boardId,
        "column": column?.toJson(),
        "columnId": columnId,
        "columnPosition": columnPosition.toJson(),
        "counter": counter,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "title": title,
        "updatedAt": updatedAt,
    };
}

class StickyBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    StickyBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory StickyBoard.fromJson(Map<String, dynamic> json) => StickyBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class FluffyColumn {
    String authorId;
    IndigoBoard board;
    String boardId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String title;
    double updatedAt;

    FluffyColumn({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.title,
        required this.updatedAt,
    });

    factory FluffyColumn.fromJson(Map<String, dynamic> json) => FluffyColumn(
        authorId: json["authorId"],
        board: IndigoBoard.fromJson(json["board"]),
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
        "board": board.toJson(),
        "boardId": boardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "title": title,
        "updatedAt": updatedAt,
    };
}

class IndigoBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    IndigoBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory IndigoBoard.fromJson(Map<String, dynamic> json) => IndigoBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class FluffyColumnPosition {
    String denominator;
    String numerator;

    FluffyColumnPosition({
        required this.denominator,
        required this.numerator,
    });

    factory FluffyColumnPosition.fromJson(Map<String, dynamic> json) => FluffyColumnPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

class DeleteCommentReq {
    String commentId;

    DeleteCommentReq({
        required this.commentId,
    });

    factory DeleteCommentReq.fromJson(Map<String, dynamic> json) => DeleteCommentReq(
        commentId: json["commentId"],
    );

    Map<String, dynamic> toJson() => {
        "commentId": commentId,
    };
}

class DeleteCommentRes {
    DeleteCommentRes();

    factory DeleteCommentRes.fromJson(Map<String, dynamic> json) => DeleteCommentRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetTaskCommentsReq {
    String taskId;

    GetTaskCommentsReq({
        required this.taskId,
    });

    factory GetTaskCommentsReq.fromJson(Map<String, dynamic> json) => GetTaskCommentsReq(
        taskId: json["taskId"],
    );

    Map<String, dynamic> toJson() => {
        "taskId": taskId,
    };
}

class GetTaskCommentsItem {
    GetTaskCommentsItemAuthor author;
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    GetTaskCommentsItemTask task;
    String taskId;
    String text;
    double updatedAt;

    GetTaskCommentsItem({
        required this.author,
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.task,
        required this.taskId,
        required this.text,
        required this.updatedAt,
    });

    factory GetTaskCommentsItem.fromJson(Map<String, dynamic> json) => GetTaskCommentsItem(
        author: GetTaskCommentsItemAuthor.fromJson(json["author"]),
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        task: GetTaskCommentsItemTask.fromJson(json["task"]),
        taskId: json["taskId"],
        text: json["text"],
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "author": author.toJson(),
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "task": task.toJson(),
        "taskId": taskId,
        "text": text,
        "updatedAt": updatedAt,
    };
}

class GetTaskCommentsItemAuthor {
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    double updatedAt;
    Version version;

    GetTaskCommentsItemAuthor({
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.updatedAt,
        required this.version,
    });

    factory GetTaskCommentsItemAuthor.fromJson(Map<String, dynamic> json) => GetTaskCommentsItemAuthor(
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
        version: versionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
        "version": versionValues.reverse[version],
    };
}

class GetTaskCommentsItemTask {
    String authorId;
    IndecentBoard board;
    String boardId;
    TentacledColumn? column;
    String? columnId;
    TentacledColumnPosition columnPosition;
    double counter;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String title;
    double updatedAt;

    GetTaskCommentsItemTask({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.column,
        required this.columnId,
        required this.columnPosition,
        required this.counter,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.title,
        required this.updatedAt,
    });

    factory GetTaskCommentsItemTask.fromJson(Map<String, dynamic> json) => GetTaskCommentsItemTask(
        authorId: json["authorId"],
        board: IndecentBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        column: json["column"] == null ? null : TentacledColumn.fromJson(json["column"]),
        columnId: json["columnId"],
        columnPosition: TentacledColumnPosition.fromJson(json["columnPosition"]),
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
        "board": board.toJson(),
        "boardId": boardId,
        "column": column?.toJson(),
        "columnId": columnId,
        "columnPosition": columnPosition.toJson(),
        "counter": counter,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "title": title,
        "updatedAt": updatedAt,
    };
}

class IndecentBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    IndecentBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory IndecentBoard.fromJson(Map<String, dynamic> json) => IndecentBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class TentacledColumn {
    String authorId;
    HilariousBoard board;
    String boardId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String title;
    double updatedAt;

    TentacledColumn({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.title,
        required this.updatedAt,
    });

    factory TentacledColumn.fromJson(Map<String, dynamic> json) => TentacledColumn(
        authorId: json["authorId"],
        board: HilariousBoard.fromJson(json["board"]),
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
        "board": board.toJson(),
        "boardId": boardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "title": title,
        "updatedAt": updatedAt,
    };
}

class HilariousBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    HilariousBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory HilariousBoard.fromJson(Map<String, dynamic> json) => HilariousBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class TentacledColumnPosition {
    String denominator;
    String numerator;

    TentacledColumnPosition({
        required this.denominator,
        required this.numerator,
    });

    factory TentacledColumnPosition.fromJson(Map<String, dynamic> json) => TentacledColumnPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

class CreateMemberReq {
    String boardId;
    String email;
    Role role;

    CreateMemberReq({
        required this.boardId,
        required this.email,
        required this.role,
    });

    factory CreateMemberReq.fromJson(Map<String, dynamic> json) => CreateMemberReq(
        boardId: json["boardId"],
        email: json["email"],
        role: roleValues.map[json["role"]]!,
    );

    Map<String, dynamic> toJson() => {
        "boardId": boardId,
        "email": email,
        "role": roleValues.reverse[role],
    };
}

enum Role {
    ADMIN,
    OWNER,
    READER,
    WRITER
}

final roleValues = EnumValues({
    "admin": Role.ADMIN,
    "owner": Role.OWNER,
    "reader": Role.READER,
    "writer": Role.WRITER
});

class CreateMemberRes {
    CreateMemberResBoard board;
    String boardId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    Role role;
    double updatedAt;
    CreateMemberResUser user;
    String userId;

    CreateMemberRes({
        required this.board,
        required this.boardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.role,
        required this.updatedAt,
        required this.user,
        required this.userId,
    });

    factory CreateMemberRes.fromJson(Map<String, dynamic> json) => CreateMemberRes(
        board: CreateMemberResBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        role: roleValues.map[json["role"]]!,
        updatedAt: json["updatedAt"]?.toDouble(),
        user: CreateMemberResUser.fromJson(json["user"]),
        userId: json["userId"],
    );

    Map<String, dynamic> toJson() => {
        "board": board.toJson(),
        "boardId": boardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "role": roleValues.reverse[role],
        "updatedAt": updatedAt,
        "user": user.toJson(),
        "userId": userId,
    };
}

class CreateMemberResBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    CreateMemberResBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory CreateMemberResBoard.fromJson(Map<String, dynamic> json) => CreateMemberResBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class CreateMemberResUser {
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    double updatedAt;
    Version version;

    CreateMemberResUser({
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.updatedAt,
        required this.version,
    });

    factory CreateMemberResUser.fromJson(Map<String, dynamic> json) => CreateMemberResUser(
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
        version: versionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
        "version": versionValues.reverse[version],
    };
}

class DeleteMemberReq {
    String memberId;

    DeleteMemberReq({
        required this.memberId,
    });

    factory DeleteMemberReq.fromJson(Map<String, dynamic> json) => DeleteMemberReq(
        memberId: json["memberId"],
    );

    Map<String, dynamic> toJson() => {
        "memberId": memberId,
    };
}

class DeleteMemberRes {
    DeleteMemberRes();

    factory DeleteMemberRes.fromJson(Map<String, dynamic> json) => DeleteMemberRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetBoardMembersReq {
    String boardId;

    GetBoardMembersReq({
        required this.boardId,
    });

    factory GetBoardMembersReq.fromJson(Map<String, dynamic> json) => GetBoardMembersReq(
        boardId: json["boardId"],
    );

    Map<String, dynamic> toJson() => {
        "boardId": boardId,
    };
}

class GetBoardMembersItem {
    GetBoardMembersItemBoard board;
    String boardId;
    double createdAt;
    bool deleted;
    String id;
    dynamic identity;
    List<String> pk;
    Role role;
    double updatedAt;
    GetBoardMembersItemUser user;
    String userId;

    GetBoardMembersItem({
        required this.board,
        required this.boardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        this.identity,
        required this.pk,
        required this.role,
        required this.updatedAt,
        required this.user,
        required this.userId,
    });

    factory GetBoardMembersItem.fromJson(Map<String, dynamic> json) => GetBoardMembersItem(
        board: GetBoardMembersItemBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        identity: json["identity"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        role: roleValues.map[json["role"]]!,
        updatedAt: json["updatedAt"]?.toDouble(),
        user: GetBoardMembersItemUser.fromJson(json["user"]),
        userId: json["userId"],
    );

    Map<String, dynamic> toJson() => {
        "board": board.toJson(),
        "boardId": boardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "identity": identity,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "role": roleValues.reverse[role],
        "updatedAt": updatedAt,
        "user": user.toJson(),
        "userId": userId,
    };
}

class GetBoardMembersItemBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    double updatedAt;

    GetBoardMembersItemBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.updatedAt,
    });

    factory GetBoardMembersItemBoard.fromJson(Map<String, dynamic> json) => GetBoardMembersItemBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
    };
}

class GetBoardMembersItemUser {
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    double updatedAt;
    Version version;

    GetBoardMembersItemUser({
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.updatedAt,
        required this.version,
    });

    factory GetBoardMembersItemUser.fromJson(Map<String, dynamic> json) => GetBoardMembersItemUser(
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        updatedAt: json["updatedAt"]?.toDouble(),
        version: versionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "updatedAt": updatedAt,
        "version": versionValues.reverse[version],
    };
}

class SetUserFullNameReq {
    String fullName;
    String userId;

    SetUserFullNameReq({
        required this.fullName,
        required this.userId,
    });

    factory SetUserFullNameReq.fromJson(Map<String, dynamic> json) => SetUserFullNameReq(
        fullName: json["fullName"],
        userId: json["userId"],
    );

    Map<String, dynamic> toJson() => {
        "fullName": fullName,
        "userId": userId,
    };
}

class SetUserFullNameRes {
    SetUserFullNameRes();

    factory SetUserFullNameRes.fromJson(Map<String, dynamic> json) => SetUserFullNameRes(
    );

    Map<String, dynamic> toJson() => {
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
