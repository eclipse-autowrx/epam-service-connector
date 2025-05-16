from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import ClassVar as _ClassVar, Iterable as _Iterable, Mapping as _Mapping, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class DataType(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    DATA_TYPE_UNSPECIFIED: _ClassVar[DataType]
    DATA_TYPE_STRING: _ClassVar[DataType]
    DATA_TYPE_BOOLEAN: _ClassVar[DataType]
    DATA_TYPE_INT8: _ClassVar[DataType]
    DATA_TYPE_INT16: _ClassVar[DataType]
    DATA_TYPE_INT32: _ClassVar[DataType]
    DATA_TYPE_INT64: _ClassVar[DataType]
    DATA_TYPE_UINT8: _ClassVar[DataType]
    DATA_TYPE_UINT16: _ClassVar[DataType]
    DATA_TYPE_UINT32: _ClassVar[DataType]
    DATA_TYPE_UINT64: _ClassVar[DataType]
    DATA_TYPE_FLOAT: _ClassVar[DataType]
    DATA_TYPE_DOUBLE: _ClassVar[DataType]
    DATA_TYPE_TIMESTAMP: _ClassVar[DataType]
    DATA_TYPE_STRING_ARRAY: _ClassVar[DataType]
    DATA_TYPE_BOOLEAN_ARRAY: _ClassVar[DataType]
    DATA_TYPE_INT8_ARRAY: _ClassVar[DataType]
    DATA_TYPE_INT16_ARRAY: _ClassVar[DataType]
    DATA_TYPE_INT32_ARRAY: _ClassVar[DataType]
    DATA_TYPE_INT64_ARRAY: _ClassVar[DataType]
    DATA_TYPE_UINT8_ARRAY: _ClassVar[DataType]
    DATA_TYPE_UINT16_ARRAY: _ClassVar[DataType]
    DATA_TYPE_UINT32_ARRAY: _ClassVar[DataType]
    DATA_TYPE_UINT64_ARRAY: _ClassVar[DataType]
    DATA_TYPE_FLOAT_ARRAY: _ClassVar[DataType]
    DATA_TYPE_DOUBLE_ARRAY: _ClassVar[DataType]
    DATA_TYPE_TIMESTAMP_ARRAY: _ClassVar[DataType]

class EntryType(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    ENTRY_TYPE_UNSPECIFIED: _ClassVar[EntryType]
    ENTRY_TYPE_ATTRIBUTE: _ClassVar[EntryType]
    ENTRY_TYPE_SENSOR: _ClassVar[EntryType]
    ENTRY_TYPE_ACTUATOR: _ClassVar[EntryType]

class View(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    VIEW_UNSPECIFIED: _ClassVar[View]
    VIEW_CURRENT_VALUE: _ClassVar[View]
    VIEW_TARGET_VALUE: _ClassVar[View]
    VIEW_METADATA: _ClassVar[View]
    VIEW_FIELDS: _ClassVar[View]
    VIEW_ALL: _ClassVar[View]

class Field(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    FIELD_UNSPECIFIED: _ClassVar[Field]
    FIELD_PATH: _ClassVar[Field]
    FIELD_VALUE: _ClassVar[Field]
    FIELD_ACTUATOR_TARGET: _ClassVar[Field]
    FIELD_METADATA: _ClassVar[Field]
    FIELD_METADATA_DATA_TYPE: _ClassVar[Field]
    FIELD_METADATA_DESCRIPTION: _ClassVar[Field]
    FIELD_METADATA_ENTRY_TYPE: _ClassVar[Field]
    FIELD_METADATA_COMMENT: _ClassVar[Field]
    FIELD_METADATA_DEPRECATION: _ClassVar[Field]
    FIELD_METADATA_UNIT: _ClassVar[Field]
    FIELD_METADATA_VALUE_RESTRICTION: _ClassVar[Field]
    FIELD_METADATA_ACTUATOR: _ClassVar[Field]
    FIELD_METADATA_SENSOR: _ClassVar[Field]
    FIELD_METADATA_ATTRIBUTE: _ClassVar[Field]
DATA_TYPE_UNSPECIFIED: DataType
DATA_TYPE_STRING: DataType
DATA_TYPE_BOOLEAN: DataType
DATA_TYPE_INT8: DataType
DATA_TYPE_INT16: DataType
DATA_TYPE_INT32: DataType
DATA_TYPE_INT64: DataType
DATA_TYPE_UINT8: DataType
DATA_TYPE_UINT16: DataType
DATA_TYPE_UINT32: DataType
DATA_TYPE_UINT64: DataType
DATA_TYPE_FLOAT: DataType
DATA_TYPE_DOUBLE: DataType
DATA_TYPE_TIMESTAMP: DataType
DATA_TYPE_STRING_ARRAY: DataType
DATA_TYPE_BOOLEAN_ARRAY: DataType
DATA_TYPE_INT8_ARRAY: DataType
DATA_TYPE_INT16_ARRAY: DataType
DATA_TYPE_INT32_ARRAY: DataType
DATA_TYPE_INT64_ARRAY: DataType
DATA_TYPE_UINT8_ARRAY: DataType
DATA_TYPE_UINT16_ARRAY: DataType
DATA_TYPE_UINT32_ARRAY: DataType
DATA_TYPE_UINT64_ARRAY: DataType
DATA_TYPE_FLOAT_ARRAY: DataType
DATA_TYPE_DOUBLE_ARRAY: DataType
DATA_TYPE_TIMESTAMP_ARRAY: DataType
ENTRY_TYPE_UNSPECIFIED: EntryType
ENTRY_TYPE_ATTRIBUTE: EntryType
ENTRY_TYPE_SENSOR: EntryType
ENTRY_TYPE_ACTUATOR: EntryType
VIEW_UNSPECIFIED: View
VIEW_CURRENT_VALUE: View
VIEW_TARGET_VALUE: View
VIEW_METADATA: View
VIEW_FIELDS: View
VIEW_ALL: View
FIELD_UNSPECIFIED: Field
FIELD_PATH: Field
FIELD_VALUE: Field
FIELD_ACTUATOR_TARGET: Field
FIELD_METADATA: Field
FIELD_METADATA_DATA_TYPE: Field
FIELD_METADATA_DESCRIPTION: Field
FIELD_METADATA_ENTRY_TYPE: Field
FIELD_METADATA_COMMENT: Field
FIELD_METADATA_DEPRECATION: Field
FIELD_METADATA_UNIT: Field
FIELD_METADATA_VALUE_RESTRICTION: Field
FIELD_METADATA_ACTUATOR: Field
FIELD_METADATA_SENSOR: Field
FIELD_METADATA_ATTRIBUTE: Field

class DataEntry(_message.Message):
    __slots__ = ("path", "value", "actuator_target", "metadata")
    PATH_FIELD_NUMBER: _ClassVar[int]
    VALUE_FIELD_NUMBER: _ClassVar[int]
    ACTUATOR_TARGET_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    path: str
    value: Datapoint
    actuator_target: Datapoint
    metadata: Metadata
    def __init__(self, path: _Optional[str] = ..., value: _Optional[_Union[Datapoint, _Mapping]] = ..., actuator_target: _Optional[_Union[Datapoint, _Mapping]] = ..., metadata: _Optional[_Union[Metadata, _Mapping]] = ...) -> None: ...

class Datapoint(_message.Message):
    __slots__ = ("timestamp", "string", "bool", "int32", "int64", "uint32", "uint64", "float", "double", "string_array", "bool_array", "int32_array", "int64_array", "uint32_array", "uint64_array", "float_array", "double_array")
    TIMESTAMP_FIELD_NUMBER: _ClassVar[int]
    STRING_FIELD_NUMBER: _ClassVar[int]
    BOOL_FIELD_NUMBER: _ClassVar[int]
    INT32_FIELD_NUMBER: _ClassVar[int]
    INT64_FIELD_NUMBER: _ClassVar[int]
    UINT32_FIELD_NUMBER: _ClassVar[int]
    UINT64_FIELD_NUMBER: _ClassVar[int]
    FLOAT_FIELD_NUMBER: _ClassVar[int]
    DOUBLE_FIELD_NUMBER: _ClassVar[int]
    STRING_ARRAY_FIELD_NUMBER: _ClassVar[int]
    BOOL_ARRAY_FIELD_NUMBER: _ClassVar[int]
    INT32_ARRAY_FIELD_NUMBER: _ClassVar[int]
    INT64_ARRAY_FIELD_NUMBER: _ClassVar[int]
    UINT32_ARRAY_FIELD_NUMBER: _ClassVar[int]
    UINT64_ARRAY_FIELD_NUMBER: _ClassVar[int]
    FLOAT_ARRAY_FIELD_NUMBER: _ClassVar[int]
    DOUBLE_ARRAY_FIELD_NUMBER: _ClassVar[int]
    timestamp: _timestamp_pb2.Timestamp
    string: str
    bool: bool
    int32: int
    int64: int
    uint32: int
    uint64: int
    float: float
    double: float
    string_array: StringArray
    bool_array: BoolArray
    int32_array: Int32Array
    int64_array: Int64Array
    uint32_array: Uint32Array
    uint64_array: Uint64Array
    float_array: FloatArray
    double_array: DoubleArray
    def __init__(self, timestamp: _Optional[_Union[_timestamp_pb2.Timestamp, _Mapping]] = ..., string: _Optional[str] = ..., bool: bool = ..., int32: _Optional[int] = ..., int64: _Optional[int] = ..., uint32: _Optional[int] = ..., uint64: _Optional[int] = ..., float: _Optional[float] = ..., double: _Optional[float] = ..., string_array: _Optional[_Union[StringArray, _Mapping]] = ..., bool_array: _Optional[_Union[BoolArray, _Mapping]] = ..., int32_array: _Optional[_Union[Int32Array, _Mapping]] = ..., int64_array: _Optional[_Union[Int64Array, _Mapping]] = ..., uint32_array: _Optional[_Union[Uint32Array, _Mapping]] = ..., uint64_array: _Optional[_Union[Uint64Array, _Mapping]] = ..., float_array: _Optional[_Union[FloatArray, _Mapping]] = ..., double_array: _Optional[_Union[DoubleArray, _Mapping]] = ...) -> None: ...

class Metadata(_message.Message):
    __slots__ = ("data_type", "entry_type", "description", "comment", "deprecation", "unit", "value_restriction", "actuator", "sensor", "attribute")
    DATA_TYPE_FIELD_NUMBER: _ClassVar[int]
    ENTRY_TYPE_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    COMMENT_FIELD_NUMBER: _ClassVar[int]
    DEPRECATION_FIELD_NUMBER: _ClassVar[int]
    UNIT_FIELD_NUMBER: _ClassVar[int]
    VALUE_RESTRICTION_FIELD_NUMBER: _ClassVar[int]
    ACTUATOR_FIELD_NUMBER: _ClassVar[int]
    SENSOR_FIELD_NUMBER: _ClassVar[int]
    ATTRIBUTE_FIELD_NUMBER: _ClassVar[int]
    data_type: DataType
    entry_type: EntryType
    description: str
    comment: str
    deprecation: str
    unit: str
    value_restriction: ValueRestriction
    actuator: Actuator
    sensor: Sensor
    attribute: Attribute
    def __init__(self, data_type: _Optional[_Union[DataType, str]] = ..., entry_type: _Optional[_Union[EntryType, str]] = ..., description: _Optional[str] = ..., comment: _Optional[str] = ..., deprecation: _Optional[str] = ..., unit: _Optional[str] = ..., value_restriction: _Optional[_Union[ValueRestriction, _Mapping]] = ..., actuator: _Optional[_Union[Actuator, _Mapping]] = ..., sensor: _Optional[_Union[Sensor, _Mapping]] = ..., attribute: _Optional[_Union[Attribute, _Mapping]] = ...) -> None: ...

class Actuator(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class Sensor(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class Attribute(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ValueRestriction(_message.Message):
    __slots__ = ("string", "signed", "unsigned", "floating_point")
    STRING_FIELD_NUMBER: _ClassVar[int]
    SIGNED_FIELD_NUMBER: _ClassVar[int]
    UNSIGNED_FIELD_NUMBER: _ClassVar[int]
    FLOATING_POINT_FIELD_NUMBER: _ClassVar[int]
    string: ValueRestrictionString
    signed: ValueRestrictionInt
    unsigned: ValueRestrictionUint
    floating_point: ValueRestrictionFloat
    def __init__(self, string: _Optional[_Union[ValueRestrictionString, _Mapping]] = ..., signed: _Optional[_Union[ValueRestrictionInt, _Mapping]] = ..., unsigned: _Optional[_Union[ValueRestrictionUint, _Mapping]] = ..., floating_point: _Optional[_Union[ValueRestrictionFloat, _Mapping]] = ...) -> None: ...

class ValueRestrictionInt(_message.Message):
    __slots__ = ("min", "max", "allowed_values")
    MIN_FIELD_NUMBER: _ClassVar[int]
    MAX_FIELD_NUMBER: _ClassVar[int]
    ALLOWED_VALUES_FIELD_NUMBER: _ClassVar[int]
    min: int
    max: int
    allowed_values: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, min: _Optional[int] = ..., max: _Optional[int] = ..., allowed_values: _Optional[_Iterable[int]] = ...) -> None: ...

class ValueRestrictionUint(_message.Message):
    __slots__ = ("min", "max", "allowed_values")
    MIN_FIELD_NUMBER: _ClassVar[int]
    MAX_FIELD_NUMBER: _ClassVar[int]
    ALLOWED_VALUES_FIELD_NUMBER: _ClassVar[int]
    min: int
    max: int
    allowed_values: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, min: _Optional[int] = ..., max: _Optional[int] = ..., allowed_values: _Optional[_Iterable[int]] = ...) -> None: ...

class ValueRestrictionFloat(_message.Message):
    __slots__ = ("min", "max", "allowed_values")
    MIN_FIELD_NUMBER: _ClassVar[int]
    MAX_FIELD_NUMBER: _ClassVar[int]
    ALLOWED_VALUES_FIELD_NUMBER: _ClassVar[int]
    min: float
    max: float
    allowed_values: _containers.RepeatedScalarFieldContainer[float]
    def __init__(self, min: _Optional[float] = ..., max: _Optional[float] = ..., allowed_values: _Optional[_Iterable[float]] = ...) -> None: ...

class ValueRestrictionString(_message.Message):
    __slots__ = ("allowed_values",)
    ALLOWED_VALUES_FIELD_NUMBER: _ClassVar[int]
    allowed_values: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, allowed_values: _Optional[_Iterable[str]] = ...) -> None: ...

class Error(_message.Message):
    __slots__ = ("code", "reason", "message")
    CODE_FIELD_NUMBER: _ClassVar[int]
    REASON_FIELD_NUMBER: _ClassVar[int]
    MESSAGE_FIELD_NUMBER: _ClassVar[int]
    code: int
    reason: str
    message: str
    def __init__(self, code: _Optional[int] = ..., reason: _Optional[str] = ..., message: _Optional[str] = ...) -> None: ...

class DataEntryError(_message.Message):
    __slots__ = ("path", "error")
    PATH_FIELD_NUMBER: _ClassVar[int]
    ERROR_FIELD_NUMBER: _ClassVar[int]
    path: str
    error: Error
    def __init__(self, path: _Optional[str] = ..., error: _Optional[_Union[Error, _Mapping]] = ...) -> None: ...

class StringArray(_message.Message):
    __slots__ = ("values",)
    VALUES_FIELD_NUMBER: _ClassVar[int]
    values: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, values: _Optional[_Iterable[str]] = ...) -> None: ...

class BoolArray(_message.Message):
    __slots__ = ("values",)
    VALUES_FIELD_NUMBER: _ClassVar[int]
    values: _containers.RepeatedScalarFieldContainer[bool]
    def __init__(self, values: _Optional[_Iterable[bool]] = ...) -> None: ...

class Int32Array(_message.Message):
    __slots__ = ("values",)
    VALUES_FIELD_NUMBER: _ClassVar[int]
    values: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, values: _Optional[_Iterable[int]] = ...) -> None: ...

class Int64Array(_message.Message):
    __slots__ = ("values",)
    VALUES_FIELD_NUMBER: _ClassVar[int]
    values: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, values: _Optional[_Iterable[int]] = ...) -> None: ...

class Uint32Array(_message.Message):
    __slots__ = ("values",)
    VALUES_FIELD_NUMBER: _ClassVar[int]
    values: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, values: _Optional[_Iterable[int]] = ...) -> None: ...

class Uint64Array(_message.Message):
    __slots__ = ("values",)
    VALUES_FIELD_NUMBER: _ClassVar[int]
    values: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, values: _Optional[_Iterable[int]] = ...) -> None: ...

class FloatArray(_message.Message):
    __slots__ = ("values",)
    VALUES_FIELD_NUMBER: _ClassVar[int]
    values: _containers.RepeatedScalarFieldContainer[float]
    def __init__(self, values: _Optional[_Iterable[float]] = ...) -> None: ...

class DoubleArray(_message.Message):
    __slots__ = ("values",)
    VALUES_FIELD_NUMBER: _ClassVar[int]
    values: _containers.RepeatedScalarFieldContainer[float]
    def __init__(self, values: _Optional[_Iterable[float]] = ...) -> None: ...
