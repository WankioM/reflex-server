#pragma once

#include "types.h"




//
//Secondary API

namespace Reflex::System
{

	class FileHandle;

	extern UIntNative GetThreadID();

	extern void DebugLog(bool brk, const char * msg);

	extern Float64 GetElapsedTime();

}
