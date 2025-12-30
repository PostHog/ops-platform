-- CreateEnum
CREATE TYPE "KeeperTestRating" AS ENUM ('STRONG_YES', 'YES', 'NO', 'STRONG_NO');

-- AlterTable: Convert wouldYouTryToKeepThem from boolean to KeeperTestRating
-- true -> STRONG_YES, false -> STRONG_NO
ALTER TABLE "KeeperTestFeedback" 
  ALTER COLUMN "wouldYouTryToKeepThem" TYPE "KeeperTestRating" 
  USING CASE 
    WHEN "wouldYouTryToKeepThem" = true THEN 'STRONG_YES'::"KeeperTestRating"
    ELSE 'STRONG_NO'::"KeeperTestRating"
  END;

-- AlterTable: Convert driverOrPassenger from DriverOrPassenger enum to KeeperTestRating
-- DRIVER -> YES, PASSENGER -> NO
ALTER TABLE "KeeperTestFeedback" 
  ALTER COLUMN "driverOrPassenger" TYPE "KeeperTestRating" 
  USING CASE 
    WHEN "driverOrPassenger" = 'DRIVER'::"DriverOrPassenger" THEN 'YES'::"KeeperTestRating"
    ELSE 'NO'::"KeeperTestRating"
  END;

-- AlterTable: Convert proactiveToday from boolean to KeeperTestRating
-- true -> STRONG_YES, false -> STRONG_NO
ALTER TABLE "KeeperTestFeedback" 
  ALTER COLUMN "proactiveToday" TYPE "KeeperTestRating" 
  USING CASE 
    WHEN "proactiveToday" = true THEN 'STRONG_YES'::"KeeperTestRating"
    ELSE 'STRONG_NO'::"KeeperTestRating"
  END;

-- AlterTable: Convert optimisticByDefault from boolean to KeeperTestRating
-- true -> STRONG_YES, false -> STRONG_NO
ALTER TABLE "KeeperTestFeedback" 
  ALTER COLUMN "optimisticByDefault" TYPE "KeeperTestRating" 
  USING CASE 
    WHEN "optimisticByDefault" = true THEN 'STRONG_YES'::"KeeperTestRating"
    ELSE 'STRONG_NO'::"KeeperTestRating"
  END;

-- DropEnum: Remove the old DriverOrPassenger enum
DROP TYPE "public"."DriverOrPassenger";
