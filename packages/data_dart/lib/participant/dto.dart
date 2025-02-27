// To parse this JSON data, do
//
//     final getDbTreeReq = getDbTreeReqFromJson(jsonString);
//     final getDbTreeRes = getDbTreeResFromJson(jsonString);
//     final getDbItemReq = getDbItemReqFromJson(jsonString);
//     final getDbItemRes = getDbItemResFromJson(jsonString);
//     final truncateDbReq = truncateDbReqFromJson(jsonString);
//     final truncateDbRes = truncateDbResFromJson(jsonString);
//     final debugReq = debugReqFromJson(jsonString);
//     final debugRes = debugResFromJson(jsonString);
//     final echoReq = echoReqFromJson(jsonString);
//     final echoRes = echoResFromJson(jsonString);
//     final getMeReq = getMeReqFromJson(jsonString);
//     final getMeValue = getMeValueFromJson(jsonString);
//     final sendSignInEmailReq = sendSignInEmailReqFromJson(jsonString);
//     final sendSignInEmailRes = sendSignInEmailResFromJson(jsonString);
//     final createBoardReq = createBoardReqFromJson(jsonString);
//     final createBoardRes = createBoardResFromJson(jsonString);
//     final verifySignInCodeReq = verifySignInCodeReqFromJson(jsonString);
//     final verifySignInCodeRes = verifySignInCodeResFromJson(jsonString);
//     final deleteDbItemReq = deleteDbItemReqFromJson(jsonString);
//     final deleteDbItemRes = deleteDbItemResFromJson(jsonString);
//     final getMyMembersReq = getMyMembersReqFromJson(jsonString);
//     final getMyMembersValue = getMyMembersValueFromJson(jsonString);
//     final getBoardReq = getBoardReqFromJson(jsonString);
//     final getBoardValue = getBoardValueFromJson(jsonString);
//     final createColumnReq = createColumnReqFromJson(jsonString);
//     final createColumnRes = createColumnResFromJson(jsonString);
//     final createCardReq = createCardReqFromJson(jsonString);
//     final createCardRes = createCardResFromJson(jsonString);
//     final getBoardViewReq = getBoardViewReqFromJson(jsonString);
//     final getBoardViewValue = getBoardViewValueFromJson(jsonString);
//     final deleteBoardReq = deleteBoardReqFromJson(jsonString);
//     final deleteBoardRes = deleteBoardResFromJson(jsonString);
//     final deleteColumnReq = deleteColumnReqFromJson(jsonString);
//     final deleteColumnRes = deleteColumnResFromJson(jsonString);
//     final deleteCardReq = deleteCardReqFromJson(jsonString);
//     final deleteCardRes = deleteCardResFromJson(jsonString);
//     final createCommentReq = createCommentReqFromJson(jsonString);
//     final createCommentRes = createCommentResFromJson(jsonString);
//     final deleteCommentReq = deleteCommentReqFromJson(jsonString);
//     final deleteCommentRes = deleteCommentResFromJson(jsonString);
//     final getCardCommentsReq = getCardCommentsReqFromJson(jsonString);
//     final getCardCommentsValue = getCardCommentsValueFromJson(jsonString);
//     final createMemberReq = createMemberReqFromJson(jsonString);
//     final createMemberRes = createMemberResFromJson(jsonString);
//     final deleteMemberReq = deleteMemberReqFromJson(jsonString);
//     final deleteMemberRes = deleteMemberResFromJson(jsonString);
//     final getBoardMembersReq = getBoardMembersReqFromJson(jsonString);
//     final getBoardMembersValue = getBoardMembersValueFromJson(jsonString);
//     final applyUserDiffReq = applyUserDiffReqFromJson(jsonString);
//     final applyUserDiffRes = applyUserDiffResFromJson(jsonString);
//     final applyBoardDiffReq = applyBoardDiffReqFromJson(jsonString);
//     final applyBoardDiffRes = applyBoardDiffResFromJson(jsonString);
//     final applyColumnDiffReq = applyColumnDiffReqFromJson(jsonString);
//     final applyColumnDiffRes = applyColumnDiffResFromJson(jsonString);
//     final applyCardDiffReq = applyCardDiffReqFromJson(jsonString);
//     final applyCardDiffRes = applyCardDiffResFromJson(jsonString);
//     final applyMemberDiffReq = applyMemberDiffReqFromJson(jsonString);
//     final applyMemberDiffRes = applyMemberDiffResFromJson(jsonString);
//     final setUserAvatarReq = setUserAvatarReqFromJson(jsonString);
//     final setUserAvatarRes = setUserAvatarResFromJson(jsonString);

import 'dart:convert';

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

DebugReq debugReqFromJson(String str) => DebugReq.fromJson(json.decode(str));

String debugReqToJson(DebugReq data) => json.encode(data.toJson());

DebugRes debugResFromJson(String str) => DebugRes.fromJson(json.decode(str));

String debugResToJson(DebugRes data) => json.encode(data.toJson());

EchoReq echoReqFromJson(String str) => EchoReq.fromJson(json.decode(str));

String echoReqToJson(EchoReq data) => json.encode(data.toJson());

EchoRes echoResFromJson(String str) => EchoRes.fromJson(json.decode(str));

String echoResToJson(EchoRes data) => json.encode(data.toJson());

GetMeReq getMeReqFromJson(String str) => GetMeReq.fromJson(json.decode(str));

String getMeReqToJson(GetMeReq data) => json.encode(data.toJson());

GetMeValue getMeValueFromJson(String str) => GetMeValue.fromJson(json.decode(str));

String getMeValueToJson(GetMeValue data) => json.encode(data.toJson());

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

DeleteDbItemReq deleteDbItemReqFromJson(String str) => DeleteDbItemReq.fromJson(json.decode(str));

String deleteDbItemReqToJson(DeleteDbItemReq data) => json.encode(data.toJson());

DeleteDbItemRes deleteDbItemResFromJson(String str) => DeleteDbItemRes.fromJson(json.decode(str));

String deleteDbItemResToJson(DeleteDbItemRes data) => json.encode(data.toJson());

GetMyMembersReq getMyMembersReqFromJson(String str) => GetMyMembersReq.fromJson(json.decode(str));

String getMyMembersReqToJson(GetMyMembersReq data) => json.encode(data.toJson());

List<GetMyMembersValue> getMyMembersValueFromJson(String str) => List<GetMyMembersValue>.from(json.decode(str).map((x) => GetMyMembersValue.fromJson(x)));

String getMyMembersValueToJson(List<GetMyMembersValue> data) => json.encode(List<dynamic>.from(data.map((x) => x.toJson())));

GetBoardReq getBoardReqFromJson(String str) => GetBoardReq.fromJson(json.decode(str));

String getBoardReqToJson(GetBoardReq data) => json.encode(data.toJson());

GetBoardValue getBoardValueFromJson(String str) => GetBoardValue.fromJson(json.decode(str));

String getBoardValueToJson(GetBoardValue data) => json.encode(data.toJson());

CreateColumnReq createColumnReqFromJson(String str) => CreateColumnReq.fromJson(json.decode(str));

String createColumnReqToJson(CreateColumnReq data) => json.encode(data.toJson());

CreateColumnRes createColumnResFromJson(String str) => CreateColumnRes.fromJson(json.decode(str));

String createColumnResToJson(CreateColumnRes data) => json.encode(data.toJson());

CreateCardReq createCardReqFromJson(String str) => CreateCardReq.fromJson(json.decode(str));

String createCardReqToJson(CreateCardReq data) => json.encode(data.toJson());

CreateCardRes createCardResFromJson(String str) => CreateCardRes.fromJson(json.decode(str));

String createCardResToJson(CreateCardRes data) => json.encode(data.toJson());

GetBoardViewReq getBoardViewReqFromJson(String str) => GetBoardViewReq.fromJson(json.decode(str));

String getBoardViewReqToJson(GetBoardViewReq data) => json.encode(data.toJson());

GetBoardViewValue getBoardViewValueFromJson(String str) => GetBoardViewValue.fromJson(json.decode(str));

String getBoardViewValueToJson(GetBoardViewValue data) => json.encode(data.toJson());

DeleteBoardReq deleteBoardReqFromJson(String str) => DeleteBoardReq.fromJson(json.decode(str));

String deleteBoardReqToJson(DeleteBoardReq data) => json.encode(data.toJson());

DeleteBoardRes deleteBoardResFromJson(String str) => DeleteBoardRes.fromJson(json.decode(str));

String deleteBoardResToJson(DeleteBoardRes data) => json.encode(data.toJson());

DeleteColumnReq deleteColumnReqFromJson(String str) => DeleteColumnReq.fromJson(json.decode(str));

String deleteColumnReqToJson(DeleteColumnReq data) => json.encode(data.toJson());

DeleteColumnRes deleteColumnResFromJson(String str) => DeleteColumnRes.fromJson(json.decode(str));

String deleteColumnResToJson(DeleteColumnRes data) => json.encode(data.toJson());

DeleteCardReq deleteCardReqFromJson(String str) => DeleteCardReq.fromJson(json.decode(str));

String deleteCardReqToJson(DeleteCardReq data) => json.encode(data.toJson());

DeleteCardRes deleteCardResFromJson(String str) => DeleteCardRes.fromJson(json.decode(str));

String deleteCardResToJson(DeleteCardRes data) => json.encode(data.toJson());

CreateCommentReq createCommentReqFromJson(String str) => CreateCommentReq.fromJson(json.decode(str));

String createCommentReqToJson(CreateCommentReq data) => json.encode(data.toJson());

CreateCommentRes createCommentResFromJson(String str) => CreateCommentRes.fromJson(json.decode(str));

String createCommentResToJson(CreateCommentRes data) => json.encode(data.toJson());

DeleteCommentReq deleteCommentReqFromJson(String str) => DeleteCommentReq.fromJson(json.decode(str));

String deleteCommentReqToJson(DeleteCommentReq data) => json.encode(data.toJson());

DeleteCommentRes deleteCommentResFromJson(String str) => DeleteCommentRes.fromJson(json.decode(str));

String deleteCommentResToJson(DeleteCommentRes data) => json.encode(data.toJson());

GetCardCommentsReq getCardCommentsReqFromJson(String str) => GetCardCommentsReq.fromJson(json.decode(str));

String getCardCommentsReqToJson(GetCardCommentsReq data) => json.encode(data.toJson());

List<GetCardCommentsValue> getCardCommentsValueFromJson(String str) => List<GetCardCommentsValue>.from(json.decode(str).map((x) => GetCardCommentsValue.fromJson(x)));

String getCardCommentsValueToJson(List<GetCardCommentsValue> data) => json.encode(List<dynamic>.from(data.map((x) => x.toJson())));

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

List<GetBoardMembersValue> getBoardMembersValueFromJson(String str) => List<GetBoardMembersValue>.from(json.decode(str).map((x) => GetBoardMembersValue.fromJson(x)));

String getBoardMembersValueToJson(List<GetBoardMembersValue> data) => json.encode(List<dynamic>.from(data.map((x) => x.toJson())));

ApplyUserDiffReq applyUserDiffReqFromJson(String str) => ApplyUserDiffReq.fromJson(json.decode(str));

String applyUserDiffReqToJson(ApplyUserDiffReq data) => json.encode(data.toJson());

ApplyUserDiffRes applyUserDiffResFromJson(String str) => ApplyUserDiffRes.fromJson(json.decode(str));

String applyUserDiffResToJson(ApplyUserDiffRes data) => json.encode(data.toJson());

ApplyBoardDiffReq applyBoardDiffReqFromJson(String str) => ApplyBoardDiffReq.fromJson(json.decode(str));

String applyBoardDiffReqToJson(ApplyBoardDiffReq data) => json.encode(data.toJson());

ApplyBoardDiffRes applyBoardDiffResFromJson(String str) => ApplyBoardDiffRes.fromJson(json.decode(str));

String applyBoardDiffResToJson(ApplyBoardDiffRes data) => json.encode(data.toJson());

ApplyColumnDiffReq applyColumnDiffReqFromJson(String str) => ApplyColumnDiffReq.fromJson(json.decode(str));

String applyColumnDiffReqToJson(ApplyColumnDiffReq data) => json.encode(data.toJson());

ApplyColumnDiffRes applyColumnDiffResFromJson(String str) => ApplyColumnDiffRes.fromJson(json.decode(str));

String applyColumnDiffResToJson(ApplyColumnDiffRes data) => json.encode(data.toJson());

ApplyCardDiffReq applyCardDiffReqFromJson(String str) => ApplyCardDiffReq.fromJson(json.decode(str));

String applyCardDiffReqToJson(ApplyCardDiffReq data) => json.encode(data.toJson());

ApplyCardDiffRes applyCardDiffResFromJson(String str) => ApplyCardDiffRes.fromJson(json.decode(str));

String applyCardDiffResToJson(ApplyCardDiffRes data) => json.encode(data.toJson());

ApplyMemberDiffReq applyMemberDiffReqFromJson(String str) => ApplyMemberDiffReq.fromJson(json.decode(str));

String applyMemberDiffReqToJson(ApplyMemberDiffReq data) => json.encode(data.toJson());

ApplyMemberDiffRes applyMemberDiffResFromJson(String str) => ApplyMemberDiffRes.fromJson(json.decode(str));

String applyMemberDiffResToJson(ApplyMemberDiffRes data) => json.encode(data.toJson());

SetUserAvatarReq setUserAvatarReqFromJson(String str) => SetUserAvatarReq.fromJson(json.decode(str));

String setUserAvatarReqToJson(SetUserAvatarReq data) => json.encode(data.toJson());

SetUserAvatarRes setUserAvatarResFromJson(String str) => SetUserAvatarRes.fromJson(json.decode(str));

String setUserAvatarResToJson(SetUserAvatarRes data) => json.encode(data.toJson());

class GetDbTreeReq {
    GetDbTreeReq();

    factory GetDbTreeReq.fromJson(Map<String, dynamic> json) => GetDbTreeReq(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetDbTreeRes {
    List<GetDbTreeRe> childrenPreview;
    List<dynamic> key;
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
        key: List<dynamic>.from(json["key"].map((x) => x)),
        name: json["name"],
        type: childrenPreviewTypeValues.map[json["type"]]!,
    );

    Map<String, dynamic> toJson() => {
        "childrenPreview": List<dynamic>.from(childrenPreview.map((x) => x.toJson())),
        "key": List<dynamic>.from(key.map((x) => x)),
        "name": name,
        "type": childrenPreviewTypeValues.reverse[type],
    };
}

class GetDbTreeRe {
    List<GetDbTreeRe> childrenPreview;
    List<dynamic> key;
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
        key: List<dynamic>.from(json["key"].map((x) => x)),
        name: json["name"],
        type: childrenPreviewTypeValues.map[json["type"]]!,
    );

    Map<String, dynamic> toJson() => {
        "childrenPreview": List<dynamic>.from(childrenPreview.map((x) => x.toJson())),
        "key": List<dynamic>.from(key.map((x) => x)),
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
    List<List<dynamic>> path;

    GetDbItemReq({
        required this.path,
    });

    factory GetDbItemReq.fromJson(Map<String, dynamic> json) => GetDbItemReq(
        path: List<List<dynamic>>.from(json["path"].map((x) => List<dynamic>.from(x.map((x) => x)))),
    );

    Map<String, dynamic> toJson() => {
        "path": List<dynamic>.from(path.map((x) => List<dynamic>.from(x.map((x) => x)))),
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

class GetMeReq {
    GetMeReq();

    factory GetMeReq.fromJson(Map<String, dynamic> json) => GetMeReq(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetMeValue {
    Identity identity;
    GetMeValueUser user;

    GetMeValue({
        required this.identity,
        required this.user,
    });

    factory GetMeValue.fromJson(Map<String, dynamic> json) => GetMeValue(
        identity: Identity.fromJson(json["identity"]),
        user: GetMeValueUser.fromJson(json["user"]),
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

class GetMeValueUser {
    String? avatarKey;
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    String state;
    double updatedAt;
    UserVersion version;

    GetMeValueUser({
        this.avatarKey,
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.state,
        required this.updatedAt,
        required this.version,
    });

    factory GetMeValueUser.fromJson(Map<String, dynamic> json) => GetMeValueUser(
        avatarKey: json["avatarKey"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: userVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "avatarKey": avatarKey,
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "updatedAt": updatedAt,
        "version": userVersionValues.reverse[version],
    };
}

enum UserVersion {
    THE_4
}

final userVersionValues = EnumValues({
    "4": UserVersion.THE_4
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

class DeleteDbItemReq {
    List<List<dynamic>> path;

    DeleteDbItemReq({
        required this.path,
    });

    factory DeleteDbItemReq.fromJson(Map<String, dynamic> json) => DeleteDbItemReq(
        path: List<List<dynamic>>.from(json["path"].map((x) => List<dynamic>.from(x.map((x) => x)))),
    );

    Map<String, dynamic> toJson() => {
        "path": List<dynamic>.from(path.map((x) => List<dynamic>.from(x.map((x) => x)))),
    };
}

class DeleteDbItemRes {
    DeleteDbItemRes();

    factory DeleteDbItemRes.fromJson(Map<String, dynamic> json) => DeleteDbItemRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetMyMembersReq {
    GetMyMembersReq();

    factory GetMyMembersReq.fromJson(Map<String, dynamic> json) => GetMyMembersReq(
    );

    Map<String, dynamic> toJson() => {
    };
}

class GetMyMembersValue {
    GetMyMembersValueBoard board;
    String boardId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    GetMyMembersValuePosition position;
    Role role;
    String state;
    double updatedAt;
    GetMyMembersValueUser user;
    String userId;
    GetMyMembersValueVersion version;

    GetMyMembersValue({
        required this.board,
        required this.boardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.position,
        required this.role,
        required this.state,
        required this.updatedAt,
        required this.user,
        required this.userId,
        required this.version,
    });

    factory GetMyMembersValue.fromJson(Map<String, dynamic> json) => GetMyMembersValue(
        board: GetMyMembersValueBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        position: GetMyMembersValuePosition.fromJson(json["position"]),
        role: roleValues.map[json["role"]]!,
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
        user: GetMyMembersValueUser.fromJson(json["user"]),
        userId: json["userId"],
        version: getMyMembersValueVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "board": board.toJson(),
        "boardId": boardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "position": position.toJson(),
        "role": roleValues.reverse[role],
        "state": state,
        "updatedAt": updatedAt,
        "user": user.toJson(),
        "userId": userId,
        "version": getMyMembersValueVersionValues.reverse[version],
    };
}

class GetMyMembersValueBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    String state;
    double updatedAt;

    GetMyMembersValueBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
        required this.updatedAt,
    });

    factory GetMyMembersValueBoard.fromJson(Map<String, dynamic> json) => GetMyMembersValueBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
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
        "state": state,
        "updatedAt": updatedAt,
    };
}

class GetMyMembersValuePosition {
    String denominator;
    String numerator;

    GetMyMembersValuePosition({
        required this.denominator,
        required this.numerator,
    });

    factory GetMyMembersValuePosition.fromJson(Map<String, dynamic> json) => GetMyMembersValuePosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
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

class GetMyMembersValueUser {
    String? avatarKey;
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    String state;
    double updatedAt;
    UserVersion version;

    GetMyMembersValueUser({
        this.avatarKey,
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.state,
        required this.updatedAt,
        required this.version,
    });

    factory GetMyMembersValueUser.fromJson(Map<String, dynamic> json) => GetMyMembersValueUser(
        avatarKey: json["avatarKey"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: userVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "avatarKey": avatarKey,
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "updatedAt": updatedAt,
        "version": userVersionValues.reverse[version],
    };
}

enum GetMyMembersValueVersion {
    THE_2
}

final getMyMembersValueVersionValues = EnumValues({
    "2": GetMyMembersValueVersion.THE_2
});

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
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    String state;
    double updatedAt;

    GetBoardValue({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
        required this.updatedAt,
    });

    factory GetBoardValue.fromJson(Map<String, dynamic> json) => GetBoardValue(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
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
        "state": state,
        "updatedAt": updatedAt,
    };
}

class CreateColumnReq {
    String boardId;
    CreateColumnReqBoardPosition boardPosition;
    String columnId;
    String title;

    CreateColumnReq({
        required this.boardId,
        required this.boardPosition,
        required this.columnId,
        required this.title,
    });

    factory CreateColumnReq.fromJson(Map<String, dynamic> json) => CreateColumnReq(
        boardId: json["boardId"],
        boardPosition: CreateColumnReqBoardPosition.fromJson(json["boardPosition"]),
        columnId: json["columnId"],
        title: json["title"],
    );

    Map<String, dynamic> toJson() => {
        "boardId": boardId,
        "boardPosition": boardPosition.toJson(),
        "columnId": columnId,
        "title": title,
    };
}

class CreateColumnReqBoardPosition {
    String denominator;
    String numerator;

    CreateColumnReqBoardPosition({
        required this.denominator,
        required this.numerator,
    });

    factory CreateColumnReqBoardPosition.fromJson(Map<String, dynamic> json) => CreateColumnReqBoardPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

class CreateColumnRes {
    String authorId;
    CreateColumnResBoard board;
    String boardId;
    CreateColumnResBoardPosition boardPosition;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String state;
    String title;
    double updatedAt;
    CreateColumnResVersion version;

    CreateColumnRes({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.boardPosition,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.state,
        required this.title,
        required this.updatedAt,
        required this.version,
    });

    factory CreateColumnRes.fromJson(Map<String, dynamic> json) => CreateColumnRes(
        authorId: json["authorId"],
        board: CreateColumnResBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        boardPosition: CreateColumnResBoardPosition.fromJson(json["boardPosition"]),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        title: json["title"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: createColumnResVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "board": board.toJson(),
        "boardId": boardId,
        "boardPosition": boardPosition.toJson(),
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "title": title,
        "updatedAt": updatedAt,
        "version": createColumnResVersionValues.reverse[version],
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
    String state;
    double updatedAt;

    CreateColumnResBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
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
        state: json["state"],
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
        "state": state,
        "updatedAt": updatedAt,
    };
}

class CreateColumnResBoardPosition {
    String denominator;
    String numerator;

    CreateColumnResBoardPosition({
        required this.denominator,
        required this.numerator,
    });

    factory CreateColumnResBoardPosition.fromJson(Map<String, dynamic> json) => CreateColumnResBoardPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

enum CreateColumnResVersion {
    THE_3
}

final createColumnResVersionValues = EnumValues({
    "3": CreateColumnResVersion.THE_3
});

class CreateCardReq {
    String diff;

    CreateCardReq({
        required this.diff,
    });

    factory CreateCardReq.fromJson(Map<String, dynamic> json) => CreateCardReq(
        diff: json["diff"],
    );

    Map<String, dynamic> toJson() => {
        "diff": diff,
    };
}

class CreateCardRes {
    String authorId;
    String boardId;
    String columnId;
    CreateCardResColumnPosition columnPosition;
    double counter;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    CreateCardResText text;
    double updatedAt;

    CreateCardRes({
        required this.authorId,
        required this.boardId,
        required this.columnId,
        required this.columnPosition,
        required this.counter,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.text,
        required this.updatedAt,
    });

    factory CreateCardRes.fromJson(Map<String, dynamic> json) => CreateCardRes(
        authorId: json["authorId"],
        boardId: json["boardId"],
        columnId: json["columnId"],
        columnPosition: CreateCardResColumnPosition.fromJson(json["columnPosition"]),
        counter: json["counter"]?.toDouble(),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        text: CreateCardResText.fromJson(json["text"]),
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
        "text": text.toJson(),
        "updatedAt": updatedAt,
    };
}

class CreateCardResColumnPosition {
    String denominator;
    String numerator;

    CreateCardResColumnPosition({
        required this.denominator,
        required this.numerator,
    });

    factory CreateCardResColumnPosition.fromJson(Map<String, dynamic> json) => CreateCardResColumnPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

class CreateCardResText {
    bool isRichtextMarker;

    CreateCardResText({
        required this.isRichtextMarker,
    });

    factory CreateCardResText.fromJson(Map<String, dynamic> json) => CreateCardResText(
        isRichtextMarker: json["__isRichtextMarker"],
    );

    Map<String, dynamic> toJson() => {
        "__isRichtextMarker": isRichtextMarker,
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

class GetBoardViewValue {
    String authorId;
    List<ColumnElement> columns;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    String state;
    double updatedAt;

    GetBoardViewValue({
        required this.authorId,
        required this.columns,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
        required this.updatedAt,
    });

    factory GetBoardViewValue.fromJson(Map<String, dynamic> json) => GetBoardViewValue(
        authorId: json["authorId"],
        columns: List<ColumnElement>.from(json["columns"].map((x) => ColumnElement.fromJson(x))),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "columns": List<dynamic>.from(columns.map((x) => x.toJson())),
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "key": key,
        "name": name,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "updatedAt": updatedAt,
    };
}

class ColumnElement {
    String authorId;
    String boardId;
    PurpleBoardPosition boardPosition;
    List<CardElement> cards;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String state;
    String title;
    double updatedAt;
    CreateColumnResVersion version;

    ColumnElement({
        required this.authorId,
        required this.boardId,
        required this.boardPosition,
        required this.cards,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.state,
        required this.title,
        required this.updatedAt,
        required this.version,
    });

    factory ColumnElement.fromJson(Map<String, dynamic> json) => ColumnElement(
        authorId: json["authorId"],
        boardId: json["boardId"],
        boardPosition: PurpleBoardPosition.fromJson(json["boardPosition"]),
        cards: List<CardElement>.from(json["cards"].map((x) => CardElement.fromJson(x))),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        title: json["title"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: createColumnResVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "boardId": boardId,
        "boardPosition": boardPosition.toJson(),
        "cards": List<dynamic>.from(cards.map((x) => x.toJson())),
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "title": title,
        "updatedAt": updatedAt,
        "version": createColumnResVersionValues.reverse[version],
    };
}

class PurpleBoardPosition {
    String denominator;
    String numerator;

    PurpleBoardPosition({
        required this.denominator,
        required this.numerator,
    });

    factory PurpleBoardPosition.fromJson(Map<String, dynamic> json) => PurpleBoardPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

class CardElement {
    PurpleAuthor author;
    String authorId;
    PurpleBoard board;
    String boardId;
    PurpleColumn? column;
    String columnId;
    PurpleColumnPosition columnPosition;
    double counter;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String state;
    PurpleText text;
    double updatedAt;

    CardElement({
        required this.author,
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
        required this.state,
        required this.text,
        required this.updatedAt,
    });

    factory CardElement.fromJson(Map<String, dynamic> json) => CardElement(
        author: PurpleAuthor.fromJson(json["author"]),
        authorId: json["authorId"],
        board: PurpleBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        column: json["column"] == null ? null : PurpleColumn.fromJson(json["column"]),
        columnId: json["columnId"],
        columnPosition: PurpleColumnPosition.fromJson(json["columnPosition"]),
        counter: json["counter"]?.toDouble(),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        text: PurpleText.fromJson(json["text"]),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "author": author.toJson(),
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
        "state": state,
        "text": text.toJson(),
        "updatedAt": updatedAt,
    };
}

class PurpleAuthor {
    String? avatarKey;
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    String state;
    double updatedAt;
    UserVersion version;

    PurpleAuthor({
        this.avatarKey,
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.state,
        required this.updatedAt,
        required this.version,
    });

    factory PurpleAuthor.fromJson(Map<String, dynamic> json) => PurpleAuthor(
        avatarKey: json["avatarKey"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: userVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "avatarKey": avatarKey,
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "updatedAt": updatedAt,
        "version": userVersionValues.reverse[version],
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
    String state;
    double updatedAt;

    PurpleBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
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
        state: json["state"],
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
        "state": state,
        "updatedAt": updatedAt,
    };
}

class PurpleColumn {
    String authorId;
    FluffyBoard board;
    String boardId;
    FluffyBoardPosition boardPosition;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String state;
    String title;
    double updatedAt;
    CreateColumnResVersion version;

    PurpleColumn({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.boardPosition,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.state,
        required this.title,
        required this.updatedAt,
        required this.version,
    });

    factory PurpleColumn.fromJson(Map<String, dynamic> json) => PurpleColumn(
        authorId: json["authorId"],
        board: FluffyBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        boardPosition: FluffyBoardPosition.fromJson(json["boardPosition"]),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        title: json["title"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: createColumnResVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "board": board.toJson(),
        "boardId": boardId,
        "boardPosition": boardPosition.toJson(),
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "title": title,
        "updatedAt": updatedAt,
        "version": createColumnResVersionValues.reverse[version],
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
    String state;
    double updatedAt;

    FluffyBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
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
        state: json["state"],
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
        "state": state,
        "updatedAt": updatedAt,
    };
}

class FluffyBoardPosition {
    String denominator;
    String numerator;

    FluffyBoardPosition({
        required this.denominator,
        required this.numerator,
    });

    factory FluffyBoardPosition.fromJson(Map<String, dynamic> json) => FluffyBoardPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
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

class PurpleText {
    bool isRichtextMarker;

    PurpleText({
        required this.isRichtextMarker,
    });

    factory PurpleText.fromJson(Map<String, dynamic> json) => PurpleText(
        isRichtextMarker: json["__isRichtextMarker"],
    );

    Map<String, dynamic> toJson() => {
        "__isRichtextMarker": isRichtextMarker,
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

class DeleteCardReq {
    String cardId;

    DeleteCardReq({
        required this.cardId,
    });

    factory DeleteCardReq.fromJson(Map<String, dynamic> json) => DeleteCardReq(
        cardId: json["cardId"],
    );

    Map<String, dynamic> toJson() => {
        "cardId": cardId,
    };
}

class DeleteCardRes {
    DeleteCardRes();

    factory DeleteCardRes.fromJson(Map<String, dynamic> json) => DeleteCardRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class CreateCommentReq {
    String cardId;
    String commentId;
    String text;

    CreateCommentReq({
        required this.cardId,
        required this.commentId,
        required this.text,
    });

    factory CreateCommentReq.fromJson(Map<String, dynamic> json) => CreateCommentReq(
        cardId: json["cardId"],
        commentId: json["commentId"],
        text: json["text"],
    );

    Map<String, dynamic> toJson() => {
        "cardId": cardId,
        "commentId": commentId,
        "text": text,
    };
}

class CreateCommentRes {
    CreateCommentResAuthor author;
    String authorId;
    CreateCommentResCard card;
    String cardId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String text;
    double updatedAt;

    CreateCommentRes({
        required this.author,
        required this.authorId,
        required this.card,
        required this.cardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.text,
        required this.updatedAt,
    });

    factory CreateCommentRes.fromJson(Map<String, dynamic> json) => CreateCommentRes(
        author: CreateCommentResAuthor.fromJson(json["author"]),
        authorId: json["authorId"],
        card: CreateCommentResCard.fromJson(json["card"]),
        cardId: json["cardId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        text: json["text"],
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "author": author.toJson(),
        "authorId": authorId,
        "card": card.toJson(),
        "cardId": cardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "text": text,
        "updatedAt": updatedAt,
    };
}

class CreateCommentResAuthor {
    String? avatarKey;
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    String state;
    double updatedAt;
    UserVersion version;

    CreateCommentResAuthor({
        this.avatarKey,
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.state,
        required this.updatedAt,
        required this.version,
    });

    factory CreateCommentResAuthor.fromJson(Map<String, dynamic> json) => CreateCommentResAuthor(
        avatarKey: json["avatarKey"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: userVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "avatarKey": avatarKey,
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "updatedAt": updatedAt,
        "version": userVersionValues.reverse[version],
    };
}

class CreateCommentResCard {
    FluffyAuthor author;
    String authorId;
    TentacledBoard board;
    String boardId;
    FluffyColumn? column;
    String columnId;
    FluffyColumnPosition columnPosition;
    double counter;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String state;
    FluffyText text;
    double updatedAt;

    CreateCommentResCard({
        required this.author,
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
        required this.state,
        required this.text,
        required this.updatedAt,
    });

    factory CreateCommentResCard.fromJson(Map<String, dynamic> json) => CreateCommentResCard(
        author: FluffyAuthor.fromJson(json["author"]),
        authorId: json["authorId"],
        board: TentacledBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        column: json["column"] == null ? null : FluffyColumn.fromJson(json["column"]),
        columnId: json["columnId"],
        columnPosition: FluffyColumnPosition.fromJson(json["columnPosition"]),
        counter: json["counter"]?.toDouble(),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        text: FluffyText.fromJson(json["text"]),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "author": author.toJson(),
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
        "state": state,
        "text": text.toJson(),
        "updatedAt": updatedAt,
    };
}

class FluffyAuthor {
    String? avatarKey;
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    String state;
    double updatedAt;
    UserVersion version;

    FluffyAuthor({
        this.avatarKey,
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.state,
        required this.updatedAt,
        required this.version,
    });

    factory FluffyAuthor.fromJson(Map<String, dynamic> json) => FluffyAuthor(
        avatarKey: json["avatarKey"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: userVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "avatarKey": avatarKey,
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "updatedAt": updatedAt,
        "version": userVersionValues.reverse[version],
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
    String state;
    double updatedAt;

    TentacledBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
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
        state: json["state"],
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
        "state": state,
        "updatedAt": updatedAt,
    };
}

class FluffyColumn {
    String authorId;
    StickyBoard board;
    String boardId;
    TentacledBoardPosition boardPosition;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String state;
    String title;
    double updatedAt;
    CreateColumnResVersion version;

    FluffyColumn({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.boardPosition,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.state,
        required this.title,
        required this.updatedAt,
        required this.version,
    });

    factory FluffyColumn.fromJson(Map<String, dynamic> json) => FluffyColumn(
        authorId: json["authorId"],
        board: StickyBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        boardPosition: TentacledBoardPosition.fromJson(json["boardPosition"]),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        title: json["title"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: createColumnResVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "board": board.toJson(),
        "boardId": boardId,
        "boardPosition": boardPosition.toJson(),
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "title": title,
        "updatedAt": updatedAt,
        "version": createColumnResVersionValues.reverse[version],
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
    String state;
    double updatedAt;

    StickyBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
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
        state: json["state"],
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
        "state": state,
        "updatedAt": updatedAt,
    };
}

class TentacledBoardPosition {
    String denominator;
    String numerator;

    TentacledBoardPosition({
        required this.denominator,
        required this.numerator,
    });

    factory TentacledBoardPosition.fromJson(Map<String, dynamic> json) => TentacledBoardPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
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

class FluffyText {
    bool isRichtextMarker;

    FluffyText({
        required this.isRichtextMarker,
    });

    factory FluffyText.fromJson(Map<String, dynamic> json) => FluffyText(
        isRichtextMarker: json["__isRichtextMarker"],
    );

    Map<String, dynamic> toJson() => {
        "__isRichtextMarker": isRichtextMarker,
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

class GetCardCommentsReq {
    String cardId;

    GetCardCommentsReq({
        required this.cardId,
    });

    factory GetCardCommentsReq.fromJson(Map<String, dynamic> json) => GetCardCommentsReq(
        cardId: json["cardId"],
    );

    Map<String, dynamic> toJson() => {
        "cardId": cardId,
    };
}

class GetCardCommentsValue {
    GetCardCommentsValueAuthor author;
    String authorId;
    GetCardCommentsValueCard card;
    String cardId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String text;
    double updatedAt;

    GetCardCommentsValue({
        required this.author,
        required this.authorId,
        required this.card,
        required this.cardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.text,
        required this.updatedAt,
    });

    factory GetCardCommentsValue.fromJson(Map<String, dynamic> json) => GetCardCommentsValue(
        author: GetCardCommentsValueAuthor.fromJson(json["author"]),
        authorId: json["authorId"],
        card: GetCardCommentsValueCard.fromJson(json["card"]),
        cardId: json["cardId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        text: json["text"],
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "author": author.toJson(),
        "authorId": authorId,
        "card": card.toJson(),
        "cardId": cardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "text": text,
        "updatedAt": updatedAt,
    };
}

class GetCardCommentsValueAuthor {
    String? avatarKey;
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    String state;
    double updatedAt;
    UserVersion version;

    GetCardCommentsValueAuthor({
        this.avatarKey,
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.state,
        required this.updatedAt,
        required this.version,
    });

    factory GetCardCommentsValueAuthor.fromJson(Map<String, dynamic> json) => GetCardCommentsValueAuthor(
        avatarKey: json["avatarKey"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: userVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "avatarKey": avatarKey,
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "updatedAt": updatedAt,
        "version": userVersionValues.reverse[version],
    };
}

class GetCardCommentsValueCard {
    TentacledAuthor author;
    String authorId;
    IndigoBoard board;
    String boardId;
    TentacledColumn? column;
    String columnId;
    TentacledColumnPosition columnPosition;
    double counter;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String state;
    TentacledText text;
    double updatedAt;

    GetCardCommentsValueCard({
        required this.author,
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
        required this.state,
        required this.text,
        required this.updatedAt,
    });

    factory GetCardCommentsValueCard.fromJson(Map<String, dynamic> json) => GetCardCommentsValueCard(
        author: TentacledAuthor.fromJson(json["author"]),
        authorId: json["authorId"],
        board: IndigoBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        column: json["column"] == null ? null : TentacledColumn.fromJson(json["column"]),
        columnId: json["columnId"],
        columnPosition: TentacledColumnPosition.fromJson(json["columnPosition"]),
        counter: json["counter"]?.toDouble(),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        text: TentacledText.fromJson(json["text"]),
        updatedAt: json["updatedAt"]?.toDouble(),
    );

    Map<String, dynamic> toJson() => {
        "author": author.toJson(),
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
        "state": state,
        "text": text.toJson(),
        "updatedAt": updatedAt,
    };
}

class TentacledAuthor {
    String? avatarKey;
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    String state;
    double updatedAt;
    UserVersion version;

    TentacledAuthor({
        this.avatarKey,
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.state,
        required this.updatedAt,
        required this.version,
    });

    factory TentacledAuthor.fromJson(Map<String, dynamic> json) => TentacledAuthor(
        avatarKey: json["avatarKey"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: userVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "avatarKey": avatarKey,
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "updatedAt": updatedAt,
        "version": userVersionValues.reverse[version],
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
    String state;
    double updatedAt;

    IndigoBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
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
        state: json["state"],
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
        "state": state,
        "updatedAt": updatedAt,
    };
}

class TentacledColumn {
    String authorId;
    IndecentBoard board;
    String boardId;
    StickyBoardPosition boardPosition;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    String state;
    String title;
    double updatedAt;
    CreateColumnResVersion version;

    TentacledColumn({
        required this.authorId,
        required this.board,
        required this.boardId,
        required this.boardPosition,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.state,
        required this.title,
        required this.updatedAt,
        required this.version,
    });

    factory TentacledColumn.fromJson(Map<String, dynamic> json) => TentacledColumn(
        authorId: json["authorId"],
        board: IndecentBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        boardPosition: StickyBoardPosition.fromJson(json["boardPosition"]),
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        title: json["title"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: createColumnResVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "authorId": authorId,
        "board": board.toJson(),
        "boardId": boardId,
        "boardPosition": boardPosition.toJson(),
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "title": title,
        "updatedAt": updatedAt,
        "version": createColumnResVersionValues.reverse[version],
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
    String state;
    double updatedAt;

    IndecentBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
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
        state: json["state"],
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
        "state": state,
        "updatedAt": updatedAt,
    };
}

class StickyBoardPosition {
    String denominator;
    String numerator;

    StickyBoardPosition({
        required this.denominator,
        required this.numerator,
    });

    factory StickyBoardPosition.fromJson(Map<String, dynamic> json) => StickyBoardPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
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

class TentacledText {
    bool isRichtextMarker;

    TentacledText({
        required this.isRichtextMarker,
    });

    factory TentacledText.fromJson(Map<String, dynamic> json) => TentacledText(
        isRichtextMarker: json["__isRichtextMarker"],
    );

    Map<String, dynamic> toJson() => {
        "__isRichtextMarker": isRichtextMarker,
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

class CreateMemberRes {
    CreateMemberResBoard board;
    String boardId;
    double createdAt;
    bool deleted;
    String id;
    List<String> pk;
    CreateMemberResPosition position;
    Role role;
    String state;
    double updatedAt;
    CreateMemberResUser user;
    String userId;
    GetMyMembersValueVersion version;

    CreateMemberRes({
        required this.board,
        required this.boardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.pk,
        required this.position,
        required this.role,
        required this.state,
        required this.updatedAt,
        required this.user,
        required this.userId,
        required this.version,
    });

    factory CreateMemberRes.fromJson(Map<String, dynamic> json) => CreateMemberRes(
        board: CreateMemberResBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        position: CreateMemberResPosition.fromJson(json["position"]),
        role: roleValues.map[json["role"]]!,
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
        user: CreateMemberResUser.fromJson(json["user"]),
        userId: json["userId"],
        version: getMyMembersValueVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "board": board.toJson(),
        "boardId": boardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "position": position.toJson(),
        "role": roleValues.reverse[role],
        "state": state,
        "updatedAt": updatedAt,
        "user": user.toJson(),
        "userId": userId,
        "version": getMyMembersValueVersionValues.reverse[version],
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
    String state;
    double updatedAt;

    CreateMemberResBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
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
        state: json["state"],
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
        "state": state,
        "updatedAt": updatedAt,
    };
}

class CreateMemberResPosition {
    String denominator;
    String numerator;

    CreateMemberResPosition({
        required this.denominator,
        required this.numerator,
    });

    factory CreateMemberResPosition.fromJson(Map<String, dynamic> json) => CreateMemberResPosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

class CreateMemberResUser {
    String? avatarKey;
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    String state;
    double updatedAt;
    UserVersion version;

    CreateMemberResUser({
        this.avatarKey,
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.state,
        required this.updatedAt,
        required this.version,
    });

    factory CreateMemberResUser.fromJson(Map<String, dynamic> json) => CreateMemberResUser(
        avatarKey: json["avatarKey"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: userVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "avatarKey": avatarKey,
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "updatedAt": updatedAt,
        "version": userVersionValues.reverse[version],
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

class GetBoardMembersValue {
    GetBoardMembersValueBoard board;
    String boardId;
    double createdAt;
    bool deleted;
    String id;
    dynamic identity;
    List<String> pk;
    GetBoardMembersValuePosition position;
    Role role;
    double updatedAt;
    GetBoardMembersValueUser user;
    String userId;
    GetMyMembersValueVersion version;

    GetBoardMembersValue({
        required this.board,
        required this.boardId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        this.identity,
        required this.pk,
        required this.position,
        required this.role,
        required this.updatedAt,
        required this.user,
        required this.userId,
        required this.version,
    });

    factory GetBoardMembersValue.fromJson(Map<String, dynamic> json) => GetBoardMembersValue(
        board: GetBoardMembersValueBoard.fromJson(json["board"]),
        boardId: json["boardId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        identity: json["identity"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        position: GetBoardMembersValuePosition.fromJson(json["position"]),
        role: roleValues.map[json["role"]]!,
        updatedAt: json["updatedAt"]?.toDouble(),
        user: GetBoardMembersValueUser.fromJson(json["user"]),
        userId: json["userId"],
        version: getMyMembersValueVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "board": board.toJson(),
        "boardId": boardId,
        "createdAt": createdAt,
        "deleted": deleted,
        "id": id,
        "identity": identity,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "position": position.toJson(),
        "role": roleValues.reverse[role],
        "updatedAt": updatedAt,
        "user": user.toJson(),
        "userId": userId,
        "version": getMyMembersValueVersionValues.reverse[version],
    };
}

class GetBoardMembersValueBoard {
    String authorId;
    double createdAt;
    bool deleted;
    String id;
    String key;
    String name;
    List<String> pk;
    String state;
    double updatedAt;

    GetBoardMembersValueBoard({
        required this.authorId,
        required this.createdAt,
        required this.deleted,
        required this.id,
        required this.key,
        required this.name,
        required this.pk,
        required this.state,
        required this.updatedAt,
    });

    factory GetBoardMembersValueBoard.fromJson(Map<String, dynamic> json) => GetBoardMembersValueBoard(
        authorId: json["authorId"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        id: json["id"],
        key: json["key"],
        name: json["name"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
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
        "state": state,
        "updatedAt": updatedAt,
    };
}

class GetBoardMembersValuePosition {
    String denominator;
    String numerator;

    GetBoardMembersValuePosition({
        required this.denominator,
        required this.numerator,
    });

    factory GetBoardMembersValuePosition.fromJson(Map<String, dynamic> json) => GetBoardMembersValuePosition(
        denominator: json["denominator"],
        numerator: json["numerator"],
    );

    Map<String, dynamic> toJson() => {
        "denominator": denominator,
        "numerator": numerator,
    };
}

class GetBoardMembersValueUser {
    String? avatarKey;
    double createdAt;
    bool deleted;
    String fullName;
    String id;
    List<String> pk;
    String state;
    double updatedAt;
    UserVersion version;

    GetBoardMembersValueUser({
        this.avatarKey,
        required this.createdAt,
        required this.deleted,
        required this.fullName,
        required this.id,
        required this.pk,
        required this.state,
        required this.updatedAt,
        required this.version,
    });

    factory GetBoardMembersValueUser.fromJson(Map<String, dynamic> json) => GetBoardMembersValueUser(
        avatarKey: json["avatarKey"],
        createdAt: json["createdAt"]?.toDouble(),
        deleted: json["deleted"],
        fullName: json["fullName"],
        id: json["id"],
        pk: List<String>.from(json["pk"].map((x) => x)),
        state: json["state"],
        updatedAt: json["updatedAt"]?.toDouble(),
        version: userVersionValues.map[json["version"]]!,
    );

    Map<String, dynamic> toJson() => {
        "avatarKey": avatarKey,
        "createdAt": createdAt,
        "deleted": deleted,
        "fullName": fullName,
        "id": id,
        "pk": List<dynamic>.from(pk.map((x) => x)),
        "state": state,
        "updatedAt": updatedAt,
        "version": userVersionValues.reverse[version],
    };
}

class ApplyUserDiffReq {
    String diff;
    String userId;

    ApplyUserDiffReq({
        required this.diff,
        required this.userId,
    });

    factory ApplyUserDiffReq.fromJson(Map<String, dynamic> json) => ApplyUserDiffReq(
        diff: json["diff"],
        userId: json["userId"],
    );

    Map<String, dynamic> toJson() => {
        "diff": diff,
        "userId": userId,
    };
}

class ApplyUserDiffRes {
    ApplyUserDiffRes();

    factory ApplyUserDiffRes.fromJson(Map<String, dynamic> json) => ApplyUserDiffRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class ApplyBoardDiffReq {
    String boardId;
    String diff;

    ApplyBoardDiffReq({
        required this.boardId,
        required this.diff,
    });

    factory ApplyBoardDiffReq.fromJson(Map<String, dynamic> json) => ApplyBoardDiffReq(
        boardId: json["boardId"],
        diff: json["diff"],
    );

    Map<String, dynamic> toJson() => {
        "boardId": boardId,
        "diff": diff,
    };
}

class ApplyBoardDiffRes {
    ApplyBoardDiffRes();

    factory ApplyBoardDiffRes.fromJson(Map<String, dynamic> json) => ApplyBoardDiffRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class ApplyColumnDiffReq {
    String columnId;
    String diff;

    ApplyColumnDiffReq({
        required this.columnId,
        required this.diff,
    });

    factory ApplyColumnDiffReq.fromJson(Map<String, dynamic> json) => ApplyColumnDiffReq(
        columnId: json["columnId"],
        diff: json["diff"],
    );

    Map<String, dynamic> toJson() => {
        "columnId": columnId,
        "diff": diff,
    };
}

class ApplyColumnDiffRes {
    ApplyColumnDiffRes();

    factory ApplyColumnDiffRes.fromJson(Map<String, dynamic> json) => ApplyColumnDiffRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class ApplyCardDiffReq {
    String cardId;
    String diff;

    ApplyCardDiffReq({
        required this.cardId,
        required this.diff,
    });

    factory ApplyCardDiffReq.fromJson(Map<String, dynamic> json) => ApplyCardDiffReq(
        cardId: json["cardId"],
        diff: json["diff"],
    );

    Map<String, dynamic> toJson() => {
        "cardId": cardId,
        "diff": diff,
    };
}

class ApplyCardDiffRes {
    ApplyCardDiffRes();

    factory ApplyCardDiffRes.fromJson(Map<String, dynamic> json) => ApplyCardDiffRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class ApplyMemberDiffReq {
    String diff;
    String memberId;

    ApplyMemberDiffReq({
        required this.diff,
        required this.memberId,
    });

    factory ApplyMemberDiffReq.fromJson(Map<String, dynamic> json) => ApplyMemberDiffReq(
        diff: json["diff"],
        memberId: json["memberId"],
    );

    Map<String, dynamic> toJson() => {
        "diff": diff,
        "memberId": memberId,
    };
}

class ApplyMemberDiffRes {
    ApplyMemberDiffRes();

    factory ApplyMemberDiffRes.fromJson(Map<String, dynamic> json) => ApplyMemberDiffRes(
    );

    Map<String, dynamic> toJson() => {
    };
}

class SetUserAvatarReq {
    String avatar;
    ContentType contentType;
    String userId;

    SetUserAvatarReq({
        required this.avatar,
        required this.contentType,
        required this.userId,
    });

    factory SetUserAvatarReq.fromJson(Map<String, dynamic> json) => SetUserAvatarReq(
        avatar: json["avatar"],
        contentType: contentTypeValues.map[json["contentType"]]!,
        userId: json["userId"],
    );

    Map<String, dynamic> toJson() => {
        "avatar": avatar,
        "contentType": contentTypeValues.reverse[contentType],
        "userId": userId,
    };
}

enum ContentType {
    IMAGE_JPEG,
    IMAGE_PNG
}

final contentTypeValues = EnumValues({
    "image/jpeg": ContentType.IMAGE_JPEG,
    "image/png": ContentType.IMAGE_PNG
});

class SetUserAvatarRes {
    SetUserAvatarRes();

    factory SetUserAvatarRes.fromJson(Map<String, dynamic> json) => SetUserAvatarRes(
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
