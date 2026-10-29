const { transaction } = require("../db/transaction");
const { consolidateOccurrences } = require("../db/occurrences");
const {
  checkPassword,
  assertCurrent,
} = require("./account-password");
const { photoName, cleanDeletedFiles } = require("./report-files");
const { romeLocalDateTime } = require("../domain/time");
const {
  findCancellationRecipients,
  addAccountCancellationNotice,
  findAccountReportPhotos,
  queueAccountPhotoDeletion,
  removeAccountRows,
} = require("../models/users.model");

async function removeAccount(request) {
  const user = await checkPassword(request);
  await transaction(async (query) => {
    await assertCurrent(query, request, user);
    await consolidateOccurrences(query);
    const now = new Date().toISOString();
    const notifications = await findCancellationRecipients(
      query,
      user.id,
      romeLocalDateTime(),
    );
    for (const item of notifications) {
      await addAccountCancellationNotice(query, item, now);
    }
    const photos = await findAccountReportPhotos(query, user.id);
    for (const photo of photos) {
      await queueAccountPhotoDeletion(query, photoName(photo.photo_path), now);
    }
    await removeAccountRows(query, user.id);
  });
  await cleanDeletedFiles().catch(() =>
    console.error("Pulizia fotografie da riprovare."),
  );
}
module.exports = { removeAccount, romeDateTime: romeLocalDateTime };
