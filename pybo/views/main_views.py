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


@bp.route('/', methods=('GET', 'POST'))
def map():
    form = RouteForm()
    time = now_time(now.hour, now.minute)
    if request.method == 'POST' and form.validate_on_submit():
        route = find_route(form.start.data, form.end.data, time)
        return render_template('map.html', route=route, form=form)
    return render_template('map.html', form=form)