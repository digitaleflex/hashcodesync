-- AlterTable: onDelete Restrict pour les créateurs (Group, Workshop, WorkshopSeries)
-- Evite qu'un compte supprime des donnees collectives en cascade.
ALTER TABLE "Group" DROP CONSTRAINT "Group_createdBy_fkey";
ALTER TABLE "Workshop" DROP CONSTRAINT "Workshop_createdBy_fkey";
ALTER TABLE "WorkshopSeries" DROP CONSTRAINT "WorkshopSeries_createdBy_fkey";
ALTER TABLE "Group" ADD CONSTRAINT "Group_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkshopSeries" ADD CONSTRAINT "WorkshopSeries_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
