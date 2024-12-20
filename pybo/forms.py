from flask_wtf import FlaskForm
from wtforms import TextAreaField
from wtforms.validators import DataRequired

class RouteForm(FlaskForm):
    # 비어있지 않게 입력할 수 있는 출발역 필드 만드는 코드입니다.
    start = TextAreaField('출발역', validators=[DataRequired('출발 역은 필수입력 항목입니다.')])
    end = TextAreaField('도착역', validators=[DataRequired('도착 역은 필수입력 항목입니다.')])