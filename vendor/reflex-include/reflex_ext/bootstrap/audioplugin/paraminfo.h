#pragma once

#include "[require].h"




//
//Primary API

namespace Reflex::Bootstrap
{

	union Value32;

	struct EnumParamInfo;

	struct ParamInfo;


	Float32 Normalise(const ParamInfo & info, Value32 value);

	Value32 Expand(const ParamInfo & info, Float32 value);

}

//
//Value32

union Reflex::Bootstrap::Value32
{
	Float32 fvalue;
	Int32 ivalue;
};




//
//ParamInfo

struct Reflex::Bootstrap::ParamInfo : public Object
{
	REFLEX_OBJECT(ParamInfo, Object);

	static ParamInfo & null;

	enum Type : UInt8
	{
		kTypeReal,
		kTypeDiscrete,
		kTypeEnum,
		kTypeBool
	};

	[[nodiscard]] static TRef <ParamInfo> CreateReal(CString && name, Float32 min, Float32 max, Float32 origin, Float32 init);
	
	[[nodiscard]] static TRef <ParamInfo> CreateDiscrete(CString && name, Int32 min, Int32 max, Int32 init);
	
	[[nodiscard]] static TRef <EnumParamInfo> CreateEnum(CString && name, const ArrayView <CString> & values, Int32 init);
	
	[[nodiscard]] static TRef <ParamInfo> CreateBool(CString && name, bool init);


	Type type = kTypeReal;

	UInt8 flags = 0;	//use this to denote things like 'enabled'

	CString name;

	Value32 initvalue;
	Value32 min;
	Value32 max;
	Value32 origin;
};




//
//EnumParamInfo

struct Reflex::Bootstrap::EnumParamInfo : public ParamInfo
{
	REFLEX_OBJECT(EnumParamInfo, ParamInfo);

	static EnumParamInfo & null;

	Array <CString> values;
};
