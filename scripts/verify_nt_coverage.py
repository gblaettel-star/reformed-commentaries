import json, re, os

NT_BOOKS = ['matthew','mark','luke','john','acts','romans','1corinthians','2corinthians',
    'galatians','ephesians','philippians','colossians','1thessalonians','2thessalonians',
    '1timothy','2timothy','titus','philemon','hebrews','james','1peter','2peter',
    '1john','2john','3john','jude','revelation']

VERSE_COUNTS = {
 'matthew':{1:25,2:23,3:17,4:25,5:48,6:34,7:29,8:34,9:38,10:42,11:30,12:50,13:58,14:36,15:39,16:28,17:27,18:35,19:30,20:34,21:46,22:46,23:39,24:51,25:46,26:75,27:66,28:20},
 'mark':{1:45,2:28,3:35,4:41,5:43,6:56,7:37,8:38,9:50,10:52,11:33,12:44,13:37,14:72,15:47,16:20},
 'luke':{1:80,2:52,3:38,4:44,5:39,6:49,7:50,8:56,9:62,10:42,11:54,12:59,13:35,14:35,15:32,16:31,17:37,18:43,19:48,20:47,21:38,22:71,23:56,24:53},
 'john':{1:51,2:25,3:36,4:54,5:47,6:71,7:53,8:59,9:41,10:42,11:57,12:50,13:38,14:31,15:27,16:33,17:26,18:40,19:42,20:31,21:25},
 'acts':{1:26,2:47,3:26,4:37,5:42,6:15,7:60,8:40,9:43,10:48,11:30,12:25,13:52,14:28,15:41,16:40,17:34,18:28,19:41,20:38,21:40,22:30,23:35,24:27,25:27,26:32,27:44,28:31},
 'romans':{1:32,2:29,3:31,4:25,5:21,6:23,7:25,8:39,9:33,10:21,11:36,12:21,13:14,14:23,15:33,16:27},
 '1corinthians':{1:31,2:16,3:23,4:21,5:13,6:20,7:40,8:13,9:27,10:33,11:34,12:31,13:13,14:40,15:58,16:24},
 '2corinthians':{1:24,2:17,3:18,4:18,5:21,6:18,7:16,8:24,9:15,10:18,11:33,12:21,13:14},
 'galatians':{1:24,2:21,3:29,4:31,5:26,6:18},
 'ephesians':{1:23,2:22,3:21,4:32,5:33,6:24},
 'philippians':{1:30,2:30,3:21,4:23},
 'colossians':{1:29,2:23,3:25,4:18},
 '1thessalonians':{1:10,2:20,3:13,4:18,5:28},
 '2thessalonians':{1:12,2:17,3:18},
 '1timothy':{1:20,2:15,3:16,4:16,5:25,6:21},
 '2timothy':{1:18,2:26,3:17,4:22},
 'titus':{1:16,2:15,3:15},
 'philemon':{1:25},
 'hebrews':{1:14,2:18,3:19,4:16,5:14,6:20,7:28,8:13,9:28,10:39,11:40,12:29,13:25},
 'james':{1:27,2:26,3:18,4:17,5:20},
 '1peter':{1:25,2:25,3:22,4:19,5:14},
 '2peter':{1:21,2:22,3:18},
 '1john':{1:10,2:29,3:24,4:21,5:21},
 '2john':{1:13},'3john':{1:14},'jude':{1:25},
 'revelation':{1:20,2:29,3:22,4:11,5:14,6:17,7:17,8:13,9:21,10:11,11:19,12:17,13:18,14:20,15:8,16:21,17:18,18:24,19:21,20:15,21:27,22:21}
}

D = os.path.expanduser('~/Documents/commentaries/unified/data')

def parse_range(ref):
    # Handle a/b notation by stripping letters after digits
    ref2 = ref.replace('&ndash;','-').replace('–','-').replace('—','-')
    # Replace patterns like "6a" or "10b" with just the number
    ref2 = re.sub(r'(\d+)[ab]', r'\1', ref2)
    nums = re.findall(r'\b(\d+)\b', ref2)
    if not nums: return set()
    if len(nums) == 1: return {int(nums[0])}
    return set(range(int(nums[0]), int(nums[-1])+1))

all_good = True
for book in NT_BOOKS:
    data = json.load(open(f'{D}/{book}.json'))
    ch_counts = VERSE_COUNTS.get(book, {})
    book_ok = True
    for ch, total in ch_counts.items():
        chdata = data.get(str(ch))
        if not chdata:
            print(f'{book} ch{ch}: CHAPTER MISSING')
            all_good = book_ok = False
            continue
        covered = set()
        for e in chdata.get('verseByVerse', []):
            if not e.get('sectionBreak'):
                covered.update(parse_range(e.get('ref','')))
        missing = [v for v in range(1, total+1) if v not in covered]
        if missing:
            print(f'{book} ch{ch}: MISSING verses {missing}')
            all_good = book_ok = False
    if book_ok:
        print(f'{book}: OK')

if all_good:
    print('\nALL 27 NT BOOKS: COMPLETE VERSE COVERAGE CONFIRMED')
