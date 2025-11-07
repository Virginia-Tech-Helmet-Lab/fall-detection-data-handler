-- Backup the original table first
CREATE TABLE videos_backup AS SELECT * FROM videos;

-- Delete duplicates, keeping only the one with the smallest video_id for each filename
DELETE FROM videos 
WHERE video_id NOT IN (
    SELECT MIN(video_id) 
    FROM (SELECT * FROM videos) 
    GROUP BY filename
);

-- Verify the results
SELECT 'Original count:' as label, COUNT(*) as count FROM videos_backup
UNION ALL
SELECT 'New count:' as label, COUNT(*) as count FROM videos
UNION ALL
SELECT 'Unique filenames:' as label, COUNT(DISTINCT filename) as count FROM videos;