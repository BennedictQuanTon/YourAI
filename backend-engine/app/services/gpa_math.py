from decimal import Decimal
from typing import List
from app.db.models import GpaSubject, GpaComponent

def convert_vn_to_au_grade(vn_score: float) -> float:
    """
    Interpolates standard Vietnamese 10-scale subject score to standard Australian 7-scale.
    - >= 8.5 (High Distinction - HD) -> 7.0
    - >= 7.5 (Distinction - D) -> 6.0
    - >= 6.5 (Credit - C) -> 5.0
    - >= 5.0 (Pass - P) -> 4.0
    - < 5.0 (Fail - F) -> 0.0
    """
    if vn_score >= 8.5:
        return 7.0
    elif vn_score >= 7.5:
        return 6.0
    elif vn_score >= 6.5:
        return 5.0
    elif vn_score >= 5.0:
        return 4.0
    else:
        return 0.0

def recalculate_subject_scores(subject: GpaSubject, components: List[GpaComponent]) -> GpaSubject:
    """
    Calculates final 10-scale and 7-scale scores for a subject based on its components and weights.
    Subject Score = Sum(Component Score * Weight / 100) / 10
    """
    if not components:
        subject.final_score_vn = Decimal("0.0")
        subject.final_score_au = Decimal("0.0")
        return subject
        
    total_weight = sum(float(c.weight) for c in components)
    if total_weight == 0:
        subject.final_score_vn = Decimal("0.0")
        subject.final_score_au = Decimal("0.0")
        return subject
        
    # Standardize weights if they don't add up to 100% or calculate absolute relative weight
    vn_sum = 0.0
    for c in components:
        # relative scale if total weight is not 100
        component_relative_weight = float(c.weight) / total_weight if total_weight != 100.0 else float(c.weight) / 100.0
        vn_sum += float(c.score_achieved) * component_relative_weight
        
    # Since score_achieved is entered out of 100, vn_sum is out of 100.
    # We divide by 10 to get the 10-scale Vietnamese grade.
    vn_score_10 = vn_sum / 10.0
    subject.final_score_vn = Decimal(f"{vn_score_10:.2f}")
    subject.final_score_au = Decimal(f"{convert_vn_to_au_grade(vn_score_10):.1f}")
    return subject

def calculate_term_gpa(subjects: List[GpaSubject]) -> tuple[float, float]:
    """
    Calculates term-wide GPAs for VN (10-scale) and AU (7-scale) weighted by credits.
    """
    if not subjects:
        return 0.0, 0.0
        
    total_credits = sum(s.credits for s in subjects)
    if total_credits == 0:
        return 0.0, 0.0
        
    vn_weighted_sum = sum(float(s.final_score_vn) * s.credits for s in subjects)
    au_weighted_sum = sum(float(s.final_score_au) * s.credits for s in subjects)
    
    term_gpa_vn = vn_weighted_sum / total_credits
    term_gpa_au = au_weighted_sum / total_credits
    
    return round(term_gpa_vn, 2), round(term_gpa_au, 2)
