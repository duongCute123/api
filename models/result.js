const ObjectID = require("mongoose").Types.ObjectId;
const RESULT_COLL = require("../database/result-coll");
const USER_COLL = require("../database/user-coll");
const EXAM_COLL = require("../database/exam-coll");

module.exports = class Result extends RESULT_COLL {
  static insert({
    point,
    falseArr,
    trueArr,
    examID,
    unfinishQuestion,
    userID,
  }) {
    return new Promise(async (resolve) => {
      try {
        if (!point || !ObjectID.isValid(examID) || !ObjectID.isValid(userID))
          return resolve({ error: true, message: "params_invalid" });

        let dataInsert = {
          point,
          falseArr,
          trueArr,
          unfinishQuestion,
          author: userID,
        };

        if (examID && ObjectID.isValid(examID)) {
          dataInsert.exam = examID;
        }
        //console.log(`dataInsert: ${dataInsert}`)

        let infoAfterInsert = new RESULT_COLL(dataInsert);
        //console.log(`infoAfterInsert: ${infoAfterInsert}`);

        let saveDataInsert = await infoAfterInsert.save();

        if (!saveDataInsert)
          return resolve({ error: true, message: "cannot_insert_point" });
        resolve({ error: false, data: infoAfterInsert });

        let arrResultOfExam = await EXAM_COLL.findByIdAndUpdate(
          examID,
          {
            $push: { result: infoAfterInsert._id },
          },
          { new: true }
        );
      } catch (error) {
        return resolve({ error: true, message: error.message });
      }
    });
  }

  //DANH SÁCH KẾT QUẢ
  static getList({ page = 1, pageSize = 100 }) {
    return new Promise(async (resolve) => {
      try {
        const skip = (page - 1) * pageSize;

        let listResult = await RESULT_COLL.find()
          .populate({
            path: "author",
          })
          .populate({
            path: "exam",
            populate: {
              path: "questions",
              select: "name",
            },
          })
          .populate({
            path: "exam",
            populate: {
              path: "result",
              select: "name",
            },
          })
          .sort({ createAt: -1 })
          .skip(skip)
          .limit(pageSize);
        if (!listResult || listResult.length === 0) {
          return resolve({
            error: true,
            message: "Không tìm thấy kết quả hoặc danh sách kết quả rỗng",
          });
        }
        return resolve({ error: false, data: listResult });
      } catch (error) {
        return resolve({ error: true, message: error.message });
      }
    });
  }

  static getInfo({ resultID }) {
    return new Promise(async (resolve) => {
      try {
        if (!ObjectID.isValid(resultID))
          return resolve({ error: true, message: "params_invalid" });

        let infoResult = await RESULT_COLL.findById(resultID).populate("exam");

        if (!infoResult)
          return resolve({ error: true, message: "cannot_get_info_data" });

        return resolve({ error: false, data: infoResult });
      } catch (error) {
        return resolve({ error: true, message: error.message });
      }
    });
  }

  static remove({ resultID }) {
    return new Promise(async (resolve) => {
      try {
        if (!ObjectID.isValid(resultID))
          return resolve({ error: true, message: "params_invalid" });

        let infoAfterRemove = await RESULT_COLL.findByIdAndDelete(resultID);

        if (!infoAfterRemove)
          return resolve({ error: true, message: "cannot_remove_data" });

        return resolve({
          error: false,
          data: infoAfterRemove,
          message: "remove_data_success",
        });
      } catch (error) {
        return resolve({ error: true, message: error.message });
      }
    });
  }

  static update({
    resultID,
    point,
    falseArr,
    trueArr,
    examID,
    userID,
    unfinishQuestion,
  }) {
    return new Promise(async (resolve) => {
      try {
        //console.log({ resultID, name, description, subjectID, level })

        if (!ObjectID.isValid(resultID))
          return resolve({ error: true, message: "params_invalid" });

        let dataUpdate = {
          point,
          examID,
          falseArr,
          trueArr,
          unfinishQuestion,
          userUpdate: userID,
        };

        let infoAfterUpdate = await RESULT_COLL.findByIdAndUpdate(
          resultID,
          dataUpdate,
          { new: true }
        );

        if (!infoAfterUpdate)
          return resolve({ error: true, message: "cannot_update_data" });

        return resolve({
          error: false,
          data: infoAfterUpdate,
          message: "update_data_success",
        });
      } catch (error) {
        return resolve({ error: true, message: error.message });
      }
    });
  }

  static calculateCorrectIncorrectCounts(result) {
    const trueCount = result.trueArr.length;
    const falseCount = result.falseArr.length;
    return { trueCount, falseCount };
  }

  static searchResultAll({ examID }) {
    return new Promise(async (resolve) => {
      try {
        let conditionObj = {};

        if (examID && ObjectID.isValid(examID)) {
          conditionObj.exam = examID;
        }

        let listResult = await RESULT_COLL.aggregate([
          {
            $match: conditionObj,
          },

          {
            $lookup: {
              from: "exams",
              localField: "exam",
              foreignField: "_id",
              as: "exam",
            },
          },
          {
            $unwind: "$exam",
          },
        ]);
        listResult = await Promise.all(
          listResult.map(async (result) => {
            const { trueCount, falseCount } =
              await calculateCorrectIncorrectCounts(result);
            return { ...result, trueCount, falseCount };
          })
        );
        if (!listResult)
          return resolve({ error: true, message: "cannot_get_list_result" });
        return resolve({ error: false, data: listResult, message: "success" });
      } catch (error) {
        return resolve({ error: true, message: error.message });
      }
    });
  }

  static getCount() {
    return new Promise(async (resolve) => {
      try {
        const count = await RESULT_COLL.countDocuments();
        resolve(count);
      } catch (error) {
        resolve(0);
      }
    });
  }
};
