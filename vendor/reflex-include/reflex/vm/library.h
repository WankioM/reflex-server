#pragma once

#include "detail/type.h"




//
//Experimental API

REFLEX_NS(Reflex::VM)

TRef <Object> Start();

Reflex::Detail::DynamicTypeRef AcquireObjectType(Reflex::Detail::DynamicTypeRef base, const CString::View & ns_symbol, const WString::View & filepath = {});	//all types are global

constexpr CString::View kNamespaceDelimiter = "::";

REFLEX_END
