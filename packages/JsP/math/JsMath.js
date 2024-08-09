export function AngleInterpolation(angle1, angle2, t) {
    let diff = angle2 - angle1;
    if (diff > 180) {
        diff -= 360;
    } else if (diff < -180) {
        diff += 360;
    }
    return angle1 + t * diff;
}

export function Repeat(value, length) {
    return value - Math.floor(value / length) * length;
}

export function Split(value, type = "fraction") {
    if(type == "integer")
    {
        return value - Math.floor(value);
    }
    else
    {
        return Math.trunc(value);
    }
}

export function Remap(value, from1, to1, from2, to2) {
    return from2 + ((value - from1) * (to2 - from2)) / (to1 - from1);
}

export function MatrixMultiply(row, column, type = "column*row")
{
    function multiplyColumnByRow() {
        let result = [];
        for (let i = 0; i < column.length; i++) {
            result[i] = [];
            for (let j = 0; j < row.length; j++) {
                result[i][j] = column[i] * row[j];
            }
        }
        return result;
    }
    
    function multiplyRowByColumn() {
        if (row.length !== column.length) {
            throw new Error("I vettori devono avere la stessa dimensione per questa operazione.");
        }
        let result = 0;
        for (let i = 0; i < row.length; i++) {
            result += row[i] * column[i];
        }
        return result;
    }
    
    if(type == "column*row")
    {
        return multiplyColumnByRow();
    }
    else
    {
        return multiplyRowByColumn();
    }        
}
