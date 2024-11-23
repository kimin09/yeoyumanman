from queue import PriorityQueue
import csv

spent_time = {}

f = open("spent_time.csv", "r", encoding="euc-kr")
reader = csv.reader(f)

for row in list(reader):
    line = row[0]
    station = row[1]
    time = row[2]

    if line not in spent_time:
        spent_time[line] = {}
    
    if row[2]:
        second = (int(row[2][0])*60) + ((int(row[2][2])*10) + int(row[2][3]))
        if second != 0:
            spent_time[line][station] = second

    else:
        spent_time[line][station] = 91

congestion = {}

f = open("congestion_by_station.csv", "r", encoding="euc-kr")
reader = csv.DictReader(f)
times = ['5시30분', '6시00분', '6시30분', '7시00분', '7시30분', '8시00분', '8시30분', '9시00분', '9시30분', '10시00분', '10시30분', '11시00분', '11시30분', '12시00분', '12시30분', '13시00분', '13시30분', '14시00분', '14시30분', '15시00분', '15시30분', '16시00분', '16시30분', '17시00분', '17시30분', '18시00분', '18시30분', '19시00분', '19시30분', '20시00분', '20시30분', '21시00분', '21시30분', '22시00분', '22시30분', '23시00분', '23시30분', '00시00분', '00시30분']
for row in list(reader):
    station = row['출발역']
    ud = row['상하구분']
    if ud == '내선': 
        ud = '하선'
    
    if ud == '외선': 
        ud = '상선'
    
    if station not in congestion:
        congestion[station] = {}

    if ud not in congestion[station]:
        congestion[station][ud] = {}

    for t in times:
        if row[t]:
            if float(row[t]) == 0:
                congestion[station][ud][t] = 32

            else:
                congestion[station][ud][t] = float(row[t])
            
        else:
            congestion[station][ud][t] = 32

def add_line_to_graph(graphs, name, line, time): # 그래프, 호선이름, 호선의 역들, 혼잡도 시간대를 받습니다.
    graph = {} # 추가하거나 수정할 딕셔너리
    # 평균 소요시간: 91 (소요시간 데이터가 없을 시 평균 값)
    t1 = 91 # 이전 역 소요시간
    t2 = 91 # 다음 역 소요시간
    # 평균 혼잡도: 32 (혼잡도 데이터가 없을 시 평균 값)
    congestion1 = 32 # 이전 역 혼잡도
    congestion2 = 32 # 다음 역 혼잡도

    if time in graphs: # 시간대가 있으면 graph에 graphs의 혼잡도 시간대의 역들 정보를 받아서 graph가 수정되면 graphs도 수정되는 코드입니다.
        graph = graphs[time]
    
    else: # 시간대가 없으면 새 딕셔너리를 넣어서 graph에 정보가 추가되면 graphs도 정보가 추가하는 코드입니다.
        graphs[time] = graph

    for station in line:
        if station not in graph:
            graph[station] = []

    for i in range(len(line)):
        # 생략된 코드는 소요시간과 혼잡도 데이터가 있을 때 그 데이터로 바꿔주는 코드입니다.
        if name in spent_time:
            if line[i] in spent_time[name]:
                t1 = spent_time[name][line[i]]
            
            if i != len(line)-1:
                if line[i+1] in spent_time[name]:
                    t2 = spent_time[name][line[i+1]]

        if line[i] in congestion:
            if '상선' in congestion[line[i]]:
                congestion1 = congestion[line[i]]['상선'][time]

            
            if '하선' in congestion[line[i]]:
                congestion2 = congestion[line[i]]['하선'][time]
        
        if i > 0: # 이전 역, 소요시간, 혼잡도, 호선이름을 추가하는 코드입니다.
            graph[line[i]].append([line[i-1], t1, congestion1, name])
        
        if i < len(line) - 1: # 다음 역, 소요시간, 혼잡도, 호선이름을 추가하는 코드입니다.
            graph[line[i]].append([line[i+1], t2, congestion2, name])

# 그래프 초기화
graph = {}
weight = {}
previous = {}
tf = {}

# 각 노선 및 역 연결
# 하행
line1 = ["연천", "전곡", "청산", "소요산", "동두천", "보산", "동두천중앙", "지행", "덕정", "덕계", "양주", "녹양", "가능", "의정부", "회룡", "망월사", "도봉산", "도봉", "방학", "창동", "녹천", "월계", "광운대", "석계", "신이문", "외대앞", "회기", "청량리", "제기동", "신설동", "동묘앞", "동대문", "종로5가", "종로3가", "종각", "시청", "서울역", "남영", "용산", "노량진", "대방", "신길", "영등포", "신도림", "구로", "구일", "개봉", "오류동", "온수", "역곡", "소사", "부천", "중동", "송내", "부개", "부평", "백운", "동암", "간석", "주안", "도화", "제물포", "도원", "동인천", "인천"]
line1_1 = ["구로", "가산디지털단지", "독산", "금천구청", "석수", "관악", "안양", "명학", "금정", "군포", "당정", "의왕", "성균관대", "화서", "수원", "세류", "병점", "세마", "오산대", "오산", "진위", "송탄", "서정리", "평택지제", "평택", "성환", "직산", "두정", "천안", "봉명", "쌍용", "아산", "탕정", "배방", "온양온천", "신창"]
line1_2 = ["금천구청", "광명"]
line1_3 = ["병점", "서동탄"]
# 내선
line2 = ["시청", "을지로입구", "을지로3가", "을지로4가", "동대문역사문화공원", "신당", "상왕십리", "왕십리", "한양대", "뚝섬", "성수", "건대입구", "구의", "강변", "잠실나루", "잠실", "잠실새내", "종합운동장", "삼성", "선릉", "역삼", "강남", "교대", "서초", "방배", "사당", "낙성대", "서울대입구", "봉천", "신림", "신대방", "구로디지털단지", "대림", "신도림", "문래", "영등포구청", "당산", "합정", "홍대입구", "신촌", "이대", "아현", "충정로", "시청"]
seongsu = ["성수", "용답", "신답", "용두", "신설동"]
sinjeong = ["신도림", "도림천", "양천구청", "신정네거리", "까치산"]
# 하행
line3 = ["대화", "주엽", "정발산", "마두", "백석", "대곡", "화정", "원당", "원흥", "삼송", "지축", "구파발", "연신내", "불광", "녹번", "홍제", "무악재", "독립문", "경복궁", "안국", "종로3가", "을지로3가", "충무로", "동대입구", "약수", "금호", "옥수", "압구정", "신사", "잠원", "고속터미널", "교대", "남부터미널", "양재", "매봉", "도곡", "대치", "학여울", "대청", "일원", "수서", "가락시장", "경찰병원", "오금"]
line4 = ["진접", "오남", "별내별가람", "당고개", "상계", "노원", "창동", "쌍문", "수유", "미아", "미아사거리", "길음", "성신여대입구", "한성대입구", "혜화", "동대문", "동대문역사문화공원", "충무로", "명동", "회현", "서울역", "숙대입구", "삼각지", "신용산", "이촌", "동작", "총신대입구", "사당", "남태령", "선바위", "경마공원", "대공원", "과천", "정부과천청사", "인덕원", "평촌", "범계", "금정", "산본", "수리산", "대야미", "반월", "상록수", "한대앞", "중앙", "고잔", "초지", "안산", "신길온천", "정왕", "오이도"]
line5 = ["방화", "개화산", "김포공항", "송정", "마곡", "발산", "우장산", "화곡", "까치산", "신정", "목동", "오목교", "양평", "영등포구청", "영등포시장", "신길", "여의도", "여의나루", "마포", "공덕", "애오개", "충정로", "서대문", "광화문", "종로3가", "을지로4가", "동대문역사문화공원", "청구", "신금호", "행당", "왕십리", "마장", "답십리", "장한평", "군자", "아차산", "광나루", "천호", "강동", "길동", "굽은다리", "명일", "고덕", "상일동", "강일", "미사", "하남풍산", "하남시청", "하남검단산"]
line5_1 = ["강동", "둔촌동", "올림픽공원", "방이", "오금", "개롱", "거여", "마천"]
line6 = ["응암", "역촌", "불광", "독바위", "연신내", "구산", "응암", "새절", "증산", "디지털미디어시티", "월드컵경기장", "마포구청", "망원", "합정", "상수", "광흥창", "대흥", "공덕", "효창공원앞", "삼각지", "녹사평", "이태원", "한강진", "버티고개", "약수", "청구", "신당", "동묘앞", "창신", "보문", "안암", "고려대", "월곡", "상월곡", "돌곶이", "석계", "태릉입구", "화랑대", "봉화산", "신내"]
line7 = ["장암", "도봉산", "수락산", "마들", "노원", "중계", "하계", "공릉", "태릉입구", "먹골", "중화", "상봉", "면목", "사가정", "용마산", "중곡", "군자", "어린이대공원", "건대입구", "자양", "청담", "강남구청", "학동", "논현", "반포", "고속터미널", "내방", "총신대입구", "남성", "숭실대입구", "상도", "장승배기", "신대방삼거리", "보라매", "신풍", "대림", "남구로", "가산디지털단지", "철산", "광명사거리", "천왕", "온수", "까치울", "부천종합운동장", "춘의", "신중동", "부천시청", "상동", "삼산체육관", "굴포천", "부평구청", "산곡", "석남"]
line8 = ["별내", "다산", "동구릉", "구리", "장자호수공원", "암사역사공원", "암사", "천호", "강동구청", "몽촌토성", "잠실", "석촌", "송파", "가락시장", "문정", "장지", "복정", "남위례", "산성", "남한산성입구", "단대오거리", "신흥", "수진", "모란"]
line9 = ["개화", "김포공항", "공항시장", "신방화", "마곡나루", "양천향교", "가양", "증미", "등촌", "염창", "신목동", "선유도", "당산", "국회의사당", "여의도", "샛강", "노량진", "노들", "흑석", "동작", "구반포", "신반포", "고속터미널", "사평", "신논현", "언주", "선정릉", "삼성중앙", "봉은사", "종합운동장", "삼전", "석촌고분", "석촌", "송파나루", "한성백제", "올림픽공원", "둔촌오륜", "중앙보훈병원"]

lines = [
 (line1, '1'),
 (line1_1, '1'),
 (line1_2, '1'),
 (line1_3, '1'),
 (line2, '2'),
 (seongsu, '2'),
 (sinjeong, '2'),
 (line3, '3'),
 (line4, '4'),
 (line5, '5'),
 (line5_1, '5'),
 (line6, '6'),
 (line7, '7'),
 (line8, '8'),
 (line9, '9')
]



# 노선 추가
for t in times:
    for line, name in lines:
        add_line_to_graph(graph, name, line, t)

def expression(t, c):
    return t + (t + c)

def dijkstra(start, time): # start는 출발역이고 time은 시간대를 받고 그래프에서 시간대에 있는 역들의 정보를 주기 위해 넣습니다.
    queue = PriorityQueue() # 우선순위 큐는 가중치가 작을수록 우선순위가 높아 먼저 처리를 하기 때문에 썼습니다.
    weight[start] = 0 # 출발역이라 가중치 0으로 설정합니다.
    queue.put((weight[start], start)) # 출발역과 가중치를 넣는 코드입니다.
    

    while not queue.empty(): # queue가 비어있을 때 까지 반복

        weight_value, station = queue.get() # 가중치와 역 정보

        if weight_value > weight[station]: # 이미 탐색을 완료했을 때
            continue

        for i, t, congestion, n in graph[time][station]: # 한 역과 연결되어있는 역, 그 역의 소요시간, 그 역의 혼잡도, 역과 그 역이 연결되어있는 호선이름입니다.
            w = expression(t, congestion) # A* 알고리즘을 적용 (가중치 구하는 식)
            if weight[i] > weight[station] + w: # 역들의 가중치를 비교
                weight[i] = weight[station] + w # 가중치가 더 작으면 더 작은 가중치를 저장합니다.
                previous[i] = (station, n) # 경로를 알아내기 위해 이전 역과 호선을 저장합니다.
                queue.put((weight[i], i)) # 가중치와 역을 큐에 넣습니다.

def find_route(start_station, end_station, time):
    for i in graph[time].keys():
        weight[i] = float('inf')
        previous[i] = (-1, '')

    dijkstra(start_station, time)
    print(weight[end_station])

    path = []
    current = end_station
    previous_station = end_station
    name = previous[end_station][1]
    previous_name = name
    while current != -1:
        path.append((current, name))
        current, name = previous[current]
        if previous_name != name:
            path.append((previous_station, name))
        previous_station = current
        previous_name = name
        
    del path[-1]
    path.reverse()

    return path