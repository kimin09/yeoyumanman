from flask import Blueprint, url_for
from pybo.forms import RouteForm
from flask import Blueprint, render_template, request, url_for
from pybo.find_route import find_route
from datetime import datetime


bp = Blueprint('main', __name__, url_prefix='/')
now = datetime.now()
def now_time(hour, minute):
    for i in range(5, 24):
        if hour == i:
            if hour+1 != 24:
                if 0 <= minute < 15:
                    if hour == 5:
                        time = f'{hour}시30분'
                        return time
                    
                    else:
                        time = f'{hour}시00분'
                        return time
                
                elif 15 <= minute < 45:
                    time = f'{hour}시30분'
                    return time

                elif 45 <= minute < 60:
                    time = f'{hour+1}시00분'
                    return time
            
            else:
                if 0 <= minute < 15:
                    time = f'{hour}시00분'
                    return time
                
                elif 15 <= minute < 45:
                    time = f'{hour}시30분'
                    return time

                elif 45 <= minute < 60:
                    time = f'{0}{0}시00분'
                    return time
            
        elif hour == 0:
            if 0 <= minute < 15:
                time = f'{0}{0}시00분'
                return time

            elif 15 <= minute < 45:
                time = f'{0}{0}시30분'
                return time
        
        elif hour == 1 or hour == 2 or hour == 3 or hour == 4:
            time = f'{5}시30분'
            return time


@bp.route('/', methods=('GET', 'POST')) # get과 post요청을 처리
def map():
    form = RouteForm() # Routeform으로 입력을 받습니다.
    time = now_time(now.hour, now.minute) # 현재시간
    if request.method == 'POST' and form.validate_on_submit(): # post요청인지 확인하고 유효성 검사하는 코드입니다.
        route = find_route(form.start.data, form.end.data, time) # post요청일 때 입력받은 데이터로 경로를 구하는 코드입니다.
        return render_template('map.html', route=route, form=form) # 경로 데이터와 요청받은 데이터를 전달하여 map.html을 보여주는 코드입니다.
    return render_template('map.html', form=form) # 입력을 받지 않았을 때 초기 화면을 보여주는 코드입니다.